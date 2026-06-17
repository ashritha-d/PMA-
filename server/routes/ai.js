const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { optionalAuth } = require('../middleware/auth');
const Property = require('../models/Property');
const Category = require('../models/Category');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const CMS = require('../models/CMS');
const Tenant = require('../models/Tenant');

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many AI requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are PMA Smart AI Assistant for the PMA platform. Your primary responsibility is to help users search, discover, navigate, and interact with PMA services, resources, properties, agreements, and account information.

## Core Capabilities

### Property Search & Discovery
- Help users find properties using natural language filters: type (apartment, villa, commercial, office, plot, PG, house, shop, land), listing type (rent/sale), budget, location (city), bedrooms, bathrooms, furnished status, amenities
- When users describe property needs like "2BHK under 50 lakhs in Hyderabad" or "furnished apartment for rent under 20,000/month", interpret and map to available properties from the database context
- Suggest properties from the provided database context that best match the user's criteria
- Always show price, location, type, bedrooms/bathrooms when listing properties
- Recommend users visit /properties page for full search with filters

### Navigation & Platform Guidance
- Guide users to the correct page: /properties (browse), /login (sign in), /register (sign up), /dashboard (personal dashboard), /bookings, /payments, /my-contracts, /favorites, /profile, /contact, /about
- Explain how to use features: search filters, booking process, payment methods, contract viewing
- Help with registration and login steps

### Authenticated User Support (when user data is provided)
- Show the user their active contracts, lease start/end dates, and days until lease expiry
- Display rent amount, payment schedule, and payment history
- Show property details for properties they are associated with
- Alert them to upcoming rent due dates or lease renewals
- Address the user by their first name when their profile is available

### FAQ & General Information
- Answer questions about PMA platform policies, rental processes, buying/selling processes
- Explain payment modes (UPI, cash, cheque, online, card)
- Explain contract types, deposit rules, notice periods
- Describe the booking process end-to-end

## Response Style
- Be concise, friendly, and professional
- Use bullet points and clear formatting for lists of properties or details
- When showing properties, format them clearly with key details
- If you don't have enough data to answer accurately, say so honestly and guide the user to contact support via /contact
- Never invent property data, prices, or user-specific information — only use what is provided in the context
- If the user is not logged in and asks for personal data, politely ask them to log in at /login`;

async function buildContext(user) {
  const ctx = {};

  try {
    const [properties, categories] = await Promise.all([
      Property.find({ isActive: true, status: 'available' })
        .select('title type listingType price priceUnit address features amenities status isFeatured propertyCode')
        .populate('category', 'name')
        .limit(30)
        .lean(),
      Category.find({ isActive: true }).select('name description').lean(),
    ]);
    ctx.properties = properties.map(p => ({
      code: p.propertyCode,
      title: p.title,
      type: p.type,
      listingType: p.listingType,
      price: p.price,
      priceUnit: p.priceUnit,
      city: p.address?.city,
      state: p.address?.state,
      bedrooms: p.features?.bedrooms,
      bathrooms: p.features?.bathrooms,
      furnished: p.features?.furnished,
      carpetArea: p.features?.carpetArea,
      amenities: p.amenities,
      category: p.category?.name,
      featured: p.isFeatured,
    }));
    ctx.categories = categories.map(c => ({ name: c.name, description: c.description }));
  } catch (e) {
    ctx.properties = [];
    ctx.categories = [];
  }

  try {
    const cms = await CMS.find({ isActive: true }).select('type title content').limit(20).lean();
    ctx.cms = cms.map(c => ({ type: c.type, title: c.title, content: c.content?.substring(0, 500) }));
  } catch (e) {
    ctx.cms = [];
  }

  if (user) {
    ctx.user = {
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      phone: user.phone,
    };

    try {
      const tenant = await Tenant.findOne({ email: user.email }).lean();
      if (tenant) {
        const contracts = await Contract.find({ tenantId: tenant._id })
          .populate('propertyId', 'title address type features')
          .select('contractNumber status contractStartDate contractEndDate rentAmount depositAmount rentPaymentType propertyId propertyCode')
          .lean();

        ctx.contracts = contracts.map(c => ({
          contractNumber: c.contractNumber,
          status: c.status,
          propertyCode: c.propertyCode,
          propertyTitle: c.propertyId?.title,
          propertyCity: c.propertyId?.address?.city,
          startDate: c.contractStartDate,
          endDate: c.contractEndDate,
          daysUntilExpiry: c.contractEndDate
            ? Math.ceil((new Date(c.contractEndDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
          rentAmount: c.rentAmount,
          depositAmount: c.depositAmount,
          paymentFrequency: c.rentPaymentType,
        }));
      }
    } catch (e) {
      ctx.contracts = [];
    }

    try {
      const payments = await Payment.find({ user: user._id })
        .populate('property', 'title')
        .select('amount paymentType status createdAt paymentMode')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      ctx.recentPayments = payments.map(p => ({
        amount: p.amount,
        type: p.paymentType,
        status: p.status,
        mode: p.paymentMode,
        date: p.createdAt,
        property: p.property?.title,
      }));
    } catch (e) {
      ctx.recentPayments = [];
    }

    try {
      const bookings = await Booking.find({ user: user._id })
        .populate('property', 'title address type')
        .select('status createdAt visitDate property')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      ctx.bookings = bookings.map(b => ({
        status: b.status,
        propertyTitle: b.property?.title,
        propertyCity: b.property?.address?.city,
        visitDate: b.visitDate,
        createdAt: b.createdAt,
      }));
    } catch (e) {
      ctx.bookings = [];
    }
  }

  return ctx;
}

router.post('/chat', aiLimiter, optionalAuth, async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: 'messages array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (res.flush) res.flush();
  };

  try {
    const ctx = await buildContext(req.user || null);
    const contextBlock = `<pma_context>\n${JSON.stringify(ctx, null, 2)}\n</pma_context>`;

    // Build Gemini chat history (all but the last message)
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Last message is the current user input, prepend context on first turn
    const lastMsg = messages[messages.length - 1];
    const userText = messages.length === 1
      ? `${contextBlock}\n\n${lastMsg.content}`
      : lastMsg.content;

    // On multi-turn, inject context into the first history message
    if (history.length > 0 && history[0].role === 'user') {
      history[0].parts[0].text = `${contextBlock}\n\n${history[0].parts[0].text}`;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(userText);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) send({ type: 'delta', text });
    }

    send({ type: 'done' });
    res.end();
  } catch (err) {
    console.error('AI chat error:', err.message);
    send({ type: 'error', message: 'AI service temporarily unavailable. Please try again.' });
    res.end();
  }
});

module.exports = router;
