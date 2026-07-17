const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { optionalAuth, adminProtect } = require('../middleware/auth');
const Property = require('../models/Property');
const Category = require('../models/Category');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const CMS = require('../models/CMS');
const Tenant = require('../models/Tenant');
const { sanitizeError } = require('../utils/sanitizeError');
const { generateText } = require('../utils/geminiClient');
const { logAiQuery } = require('../utils/aiQueryLogger');
const { titleSimilarity } = require('../utils/similarity');

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many AI requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const GEMINI_URL = `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

router.get('/seed', async (req, res) => {
  const User = require('../models/User');
  const Property = require('../models/Property');
  const Category = require('../models/Category');

  const USERS = [
    { firstName:'Arjun',   lastName:'Sharma',   email:'arjun.sharma@gmail.com',    phone:'9876543210' },
    { firstName:'Priya',   lastName:'Reddy',    email:'priya.reddy@gmail.com',     phone:'9876543211' },
    { firstName:'Rohit',   lastName:'Mehta',    email:'rohit.mehta@gmail.com',     phone:'9876543212' },
    { firstName:'Sneha',   lastName:'Patel',    email:'sneha.patel@gmail.com',     phone:'9876543213' },
    { firstName:'Vikram',  lastName:'Nair',     email:'vikram.nair@gmail.com',     phone:'9876543214' },
    { firstName:'Divya',   lastName:'Iyer',     email:'divya.iyer@gmail.com',      phone:'9876543215' },
    { firstName:'Karthik', lastName:'Kumar',    email:'karthik.kumar@gmail.com',   phone:'9876543216' },
    { firstName:'Ananya',  lastName:'Singh',    email:'ananya.singh@gmail.com',    phone:'9876543217' },
    { firstName:'Rahul',   lastName:'Verma',    email:'rahul.verma@gmail.com',     phone:'9876543218' },
    { firstName:'Meera',   lastName:'Joshi',    email:'meera.joshi@gmail.com',     phone:'9876543219' },
    { firstName:'Suresh',  lastName:'Pillai',   email:'suresh.pillai@gmail.com',   phone:'9876543220' },
    { firstName:'Lakshmi', lastName:'Rao',      email:'lakshmi.rao@gmail.com',     phone:'9876543221' },
    { firstName:'Aditya',  lastName:'Bose',     email:'aditya.bose@gmail.com',     phone:'9876543222' },
    { firstName:'Pooja',   lastName:'Gupta',    email:'pooja.gupta@gmail.com',     phone:'9876543223' },
    { firstName:'Nikhil',  lastName:'Desai',    email:'nikhil.desai@gmail.com',    phone:'9876543224' },
    { firstName:'Kavitha', lastName:'Menon',    email:'kavitha.menon@gmail.com',   phone:'9876543225' },
    { firstName:'Sanjay',  lastName:'Tiwari',   email:'sanjay.tiwari@gmail.com',   phone:'9876543226' },
    { firstName:'Deepika', lastName:'Chopra',   email:'deepika.chopra@gmail.com',  phone:'9876543227' },
    { firstName:'Manoj',   lastName:'Pandey',   email:'manoj.pandey@gmail.com',    phone:'9876543228' },
    { firstName:'Shruti',  lastName:'Agarwal',  email:'shruti.agarwal@gmail.com',  phone:'9876543229' },
    { firstName:'Harish',  lastName:'Krishnan', email:'harish.krishnan@gmail.com', phone:'9876543230' },
    { firstName:'Nisha',   lastName:'Bajaj',    email:'nisha.bajaj@gmail.com',     phone:'9876543231' },
    { firstName:'Ravi',    lastName:'Shankar',  email:'ravi.shankar@gmail.com',    phone:'9876543232' },
    { firstName:'Geeta',   lastName:'Malhotra', email:'geeta.malhotra@gmail.com',  phone:'9876543233' },
    { firstName:'Praveen', lastName:'Shetty',   email:'praveen.shetty@gmail.com',  phone:'9876543234' },
  ];

  const CATEGORY_NAMES = ['Apartment','Villa','House','Commercial','Office','Shop','Land','Plot','PG','Luxury'];

  const results = { users: { created:0, skipped:0 }, categories: { created:0 }, properties: { created:0, skipped:0 }, errors:[] };

  for (const u of USERS) {
    try {
      const exists = await User.findOne({ email: u.email });
      if (exists) { results.users.skipped++; continue; }
      await User.create({ ...u, password: 'Demo@1234', isEmailVerified: true, status: 'active' });
      results.users.created++;
    } catch(e) { results.errors.push(`User ${u.email}: ${e.message}`); }
  }

  const cats = [];
  for (const name of CATEGORY_NAMES) {
    let cat = await Category.findOne({ name });
    if (!cat) { cat = await Category.create({ name, slug: name.toLowerCase(), isActive: true }); results.categories.created++; }
    cats.push(cat);
  }
  const cm = {}; cats.forEach(c => { cm[c.name] = c._id; });

  const props = [
    { title:'Spacious 2BHK in Banjara Hills', type:'apartment', listingType:'rent', price:22000, priceUnit:'month', category:cm['Apartment'], address:{line1:'Prestige Tower',city:'Hyderabad',state:'Telangana',zipCode:'500034'}, features:{bedrooms:2,bathrooms:2,carpetArea:1050,furnished:'semi-furnished'}, amenities:['Lift','Security','Power Backup','Car Parking'], status:'available', isFeatured:true, description:'Well-maintained 2BHK in prime Banjara Hills. Close to schools and malls.' },
    { title:'Modern 3BHK Apartment in Whitefield', type:'apartment', listingType:'rent', price:35000, priceUnit:'month', category:cm['Apartment'], address:{line1:'Sobha City',city:'Bangalore',state:'Karnataka',zipCode:'560066'}, features:{bedrooms:3,bathrooms:2,carpetArea:1450,furnished:'furnished'}, amenities:['Swimming Pool','Gym','Lift','Security'], status:'available', isFeatured:true, description:'Premium furnished 3BHK in Whitefield IT hub.' },
    { title:'Affordable 1BHK in Andheri East', type:'apartment', listingType:'rent', price:18000, priceUnit:'month', category:cm['Apartment'], address:{line1:'Lotus Heights',city:'Mumbai',state:'Maharashtra',zipCode:'400093'}, features:{bedrooms:1,bathrooms:1,carpetArea:620,furnished:'unfurnished'}, amenities:['Security','Power Backup'], status:'available', isFeatured:false, description:'Compact 1BHK near Andheri metro station.' },
    { title:'Luxury 4BHK Penthouse in OMR', type:'apartment', listingType:'sale', price:9500000, priceUnit:'total', category:cm['Apartment'], address:{line1:'Prestige Towers OMR',city:'Chennai',state:'Tamil Nadu',zipCode:'600119'}, features:{bedrooms:4,bathrooms:4,carpetArea:3200,furnished:'furnished'}, amenities:['Rooftop Pool','Gym','Theatre Room'], status:'available', isFeatured:true, description:'Ultra-luxury penthouse with panoramic city views in OMR.' },
    { title:'Budget 2BHK near Hinjewadi IT Park', type:'apartment', listingType:'rent', price:17000, priceUnit:'month', category:cm['Apartment'], address:{line1:'Green Valley Apts',city:'Pune',state:'Maharashtra',zipCode:'411057'}, features:{bedrooms:2,bathrooms:1,carpetArea:890,furnished:'semi-furnished'}, amenities:['Parking','Security','Garden'], status:'available', isFeatured:false, description:'Affordable 2BHK walking distance from Hinjewadi IT companies.' },
    { title:'Premium 3BHK in Gachibowli', type:'apartment', listingType:'sale', price:7800000, priceUnit:'total', category:cm['Apartment'], address:{line1:'My Home Avatar',city:'Hyderabad',state:'Telangana',zipCode:'500032'}, features:{bedrooms:3,bathrooms:3,carpetArea:1850,furnished:'unfurnished'}, amenities:['Gym','Swimming Pool','Kids Zone','Security'], status:'available', isFeatured:true, description:'Ready-to-move 3BHK in Gachibowli tech hub.' },
    { title:'Studio Apartment in Koramangala', type:'apartment', listingType:'rent', price:14000, priceUnit:'month', category:cm['Apartment'], address:{line1:'Maple Residency',city:'Bangalore',state:'Karnataka',zipCode:'560095'}, features:{bedrooms:1,bathrooms:1,carpetArea:450,furnished:'furnished'}, amenities:['Security','WiFi','Power Backup'], status:'available', isFeatured:false, description:'Fully furnished studio in heart of Koramangala.' },
    { title:'2BHK Apartment near Airport Delhi', type:'apartment', listingType:'rent', price:28000, priceUnit:'month', category:cm['Apartment'], address:{line1:'Aerocity Residences',city:'Delhi',state:'Delhi',zipCode:'110037'}, features:{bedrooms:2,bathrooms:2,carpetArea:1100,furnished:'semi-furnished'}, amenities:['Lift','Security','Parking'], status:'available', isFeatured:false, description:'Convenient 2BHK near IGI Airport with metro connectivity.' },
    { title:'4BHK Villa in Jubilee Hills', type:'villa', listingType:'sale', price:28000000, priceUnit:'total', category:cm['Villa'], address:{line1:'Road No 36 Jubilee Hills',city:'Hyderabad',state:'Telangana',zipCode:'500033'}, features:{bedrooms:4,bathrooms:4,carpetArea:4200,furnished:'furnished'}, amenities:['Private Pool','Garden','Home Theatre'], status:'available', isFeatured:true, description:'Luxurious 4BHK villa with private pool in Jubilee Hills.' },
    { title:'3BHK Villa in Sarjapur Road', type:'villa', listingType:'sale', price:18500000, priceUnit:'total', category:cm['Villa'], address:{line1:'Adarsh Palm Retreat',city:'Bangalore',state:'Karnataka',zipCode:'560035'}, features:{bedrooms:3,bathrooms:3,carpetArea:2800,furnished:'semi-furnished'}, amenities:['Community Pool','Gym','Clubhouse','24hr Security'], status:'available', isFeatured:true, description:'Elegant 3BHK villa in gated community on Sarjapur Road.' },
    { title:'5BHK Beach Villa in ECR Chennai', type:'villa', listingType:'sale', price:45000000, priceUnit:'total', category:cm['Villa'], address:{line1:'East Coast Road Neelankarai',city:'Chennai',state:'Tamil Nadu',zipCode:'600041'}, features:{bedrooms:5,bathrooms:5,carpetArea:5500,furnished:'furnished'}, amenities:['Beach Access','Private Pool','Jacuzzi'], status:'available', isFeatured:true, description:'Stunning beachfront villa with direct sea access.' },
    { title:'Villa with Garden in Kothrud', type:'villa', listingType:'rent', price:65000, priceUnit:'month', category:cm['Villa'], address:{line1:'Kothrud Chandni Chowk',city:'Pune',state:'Maharashtra',zipCode:'411038'}, features:{bedrooms:4,bathrooms:3,carpetArea:3000,furnished:'furnished'}, amenities:['Garden','Garage','Security','Generator'], status:'available', isFeatured:false, description:'Spacious furnished villa with lush garden in Kothrud.' },
    { title:'Luxury Villa in Hitech City', type:'villa', listingType:'rent', price:90000, priceUnit:'month', category:cm['Villa'], address:{line1:'Madhapur HITEC City',city:'Hyderabad',state:'Telangana',zipCode:'500081'}, features:{bedrooms:5,bathrooms:5,carpetArea:4800,furnished:'furnished'}, amenities:['Private Pool','Smart Home','Home Theatre','Gym'], status:'available', isFeatured:true, description:'Premium furnished villa ideal for senior executives.' },
    { title:'Independent 3BHK House in Dilsukhnagar', type:'house', listingType:'sale', price:6500000, priceUnit:'total', category:cm['House'], address:{line1:'Plot 12 Dilsukhnagar',city:'Hyderabad',state:'Telangana',zipCode:'500036'}, features:{bedrooms:3,bathrooms:2,carpetArea:1600,furnished:'unfurnished'}, amenities:['Car Parking','Terrace','Generator'], status:'available', isFeatured:false, description:'Solid independent house with terrace in Dilsukhnagar.' },
    { title:'4BHK Duplex House in Navi Mumbai', type:'house', listingType:'sale', price:15000000, priceUnit:'total', category:cm['House'], address:{line1:'Sector 15 Kharghar',city:'Mumbai',state:'Maharashtra',zipCode:'410210'}, features:{bedrooms:4,bathrooms:3,carpetArea:2600,furnished:'semi-furnished'}, amenities:['Parking','Garden','Security'], status:'available', isFeatured:true, description:'Spacious duplex house in Kharghar with sea view.' },
    { title:'Traditional Home in Alwarpet', type:'house', listingType:'sale', price:22000000, priceUnit:'total', category:cm['House'], address:{line1:'3rd Cross Street Alwarpet',city:'Chennai',state:'Tamil Nadu',zipCode:'600018'}, features:{bedrooms:4,bathrooms:3,carpetArea:2800,furnished:'unfurnished'}, amenities:['Car Parking','Puja Room','Terrace Garden'], status:'available', isFeatured:false, description:'Classic Tamil Nadu-style independent house in Alwarpet.' },
    { title:'Budget 2BHK House in Miyapur', type:'house', listingType:'rent', price:10000, priceUnit:'month', category:cm['House'], address:{line1:'Chandanagar Miyapur',city:'Hyderabad',state:'Telangana',zipCode:'500050'}, features:{bedrooms:2,bathrooms:1,carpetArea:850,furnished:'unfurnished'}, amenities:['Parking','Borewell Water'], status:'available', isFeatured:false, description:'Affordable independent house in Miyapur near metro.' },
    { title:'3BHK House in CV Raman Nagar', type:'house', listingType:'rent', price:24000, priceUnit:'month', category:cm['House'], address:{line1:'CV Raman Nagar Main Road',city:'Bangalore',state:'Karnataka',zipCode:'560093'}, features:{bedrooms:3,bathrooms:2,carpetArea:1400,furnished:'semi-furnished'}, amenities:['Parking','Garden','Security'], status:'available', isFeatured:false, description:'Semi-furnished house in peaceful CV Raman Nagar.' },
    { title:'Showroom Space on MG Road', type:'commercial', listingType:'rent', price:85000, priceUnit:'month', category:cm['Commercial'], address:{line1:'MG Road Commercial Complex',city:'Bangalore',state:'Karnataka',zipCode:'560001'}, features:{bedrooms:0,bathrooms:2,carpetArea:2400,furnished:'unfurnished'}, amenities:['Power Backup','Parking','Security'], status:'available', isFeatured:true, description:'Prime retail space on MG Road with high foot traffic.' },
    { title:'Commercial Space in Banjara Hills', type:'commercial', listingType:'sale', price:35000000, priceUnit:'total', category:cm['Commercial'], address:{line1:'Road No 12 Banjara Hills',city:'Hyderabad',state:'Telangana',zipCode:'500034'}, features:{bedrooms:0,bathrooms:3,carpetArea:3800,furnished:'unfurnished'}, amenities:['Parking','Security','Power Backup'], status:'available', isFeatured:true, description:'Premium commercial property in Banjara Hills business district.' },
    { title:'Restaurant Space in Anna Nagar', type:'commercial', listingType:'rent', price:55000, priceUnit:'month', category:cm['Commercial'], address:{line1:'2nd Avenue Anna Nagar',city:'Chennai',state:'Tamil Nadu',zipCode:'600040'}, features:{bedrooms:0,bathrooms:4,carpetArea:2200,furnished:'unfurnished'}, amenities:['Exhaust Setup','Power Backup','Parking'], status:'available', isFeatured:false, description:'Ready-to-use restaurant space in busy Anna Nagar.' },
    { title:'Furnished Office in Cyber Towers', type:'office', listingType:'rent', price:150000, priceUnit:'month', category:cm['Office'], address:{line1:'Cyber Towers HITEC City',city:'Hyderabad',state:'Telangana',zipCode:'500081'}, features:{bedrooms:0,bathrooms:4,carpetArea:5000,furnished:'furnished'}, amenities:['High-Speed Internet','24hr AC','Security','Cafeteria'], status:'available', isFeatured:true, description:'Premium furnished office in iconic Cyber Towers.' },
    { title:'Office Space in BKC Mumbai', type:'office', listingType:'rent', price:280000, priceUnit:'month', category:cm['Office'], address:{line1:'Bandra Kurla Complex',city:'Mumbai',state:'Maharashtra',zipCode:'400051'}, features:{bedrooms:0,bathrooms:6,carpetArea:8000,furnished:'semi-furnished'}, amenities:['Parking','Cafeteria','Security','Reception'], status:'available', isFeatured:true, description:'Grade-A office in BKC — Mumbai prime financial district.' },
    { title:'Startup Office in Koramangala', type:'office', listingType:'rent', price:45000, priceUnit:'month', category:cm['Office'], address:{line1:'80 Feet Road Koramangala',city:'Bangalore',state:'Karnataka',zipCode:'560034'}, features:{bedrooms:0,bathrooms:2,carpetArea:1500,furnished:'furnished'}, amenities:['WiFi','Meeting Room','Parking','24hr Access'], status:'available', isFeatured:false, description:'Compact furnished office for startups in Koramangala.' },
    { title:'Shop in Abids Commercial Area', type:'shop', listingType:'rent', price:25000, priceUnit:'month', category:cm['Shop'], address:{line1:'Abids Near GPO',city:'Hyderabad',state:'Telangana',zipCode:'500001'}, features:{bedrooms:0,bathrooms:1,carpetArea:400,furnished:'unfurnished'}, amenities:['Power Backup','Security Shutter'], status:'available', isFeatured:false, description:'Ground floor shop in busy Abids commercial hub.' },
    { title:'Grocery Store Space in HSR Layout', type:'shop', listingType:'rent', price:30000, priceUnit:'month', category:cm['Shop'], address:{line1:'Sector 1 HSR Layout',city:'Bangalore',state:'Karnataka',zipCode:'560102'}, features:{bedrooms:0,bathrooms:1,carpetArea:550,furnished:'unfurnished'}, amenities:['Power Backup','Parking','Cold Storage Room'], status:'available', isFeatured:false, description:'Well-located shop in HSR Layout busiest commercial street.' },
    { title:'Corner Shop in Juhu Mumbai', type:'shop', listingType:'sale', price:8500000, priceUnit:'total', category:cm['Shop'], address:{line1:'Juhu Tara Road',city:'Mumbai',state:'Maharashtra',zipCode:'400049'}, features:{bedrooms:0,bathrooms:1,carpetArea:700,furnished:'unfurnished'}, amenities:['Air Conditioning','Power Backup'], status:'available', isFeatured:true, description:'Prominent corner shop in upscale Juhu. Perfect for boutique or cafe.' },
    { title:'Agricultural Land in Shadnagar', type:'land', listingType:'sale', price:3500000, priceUnit:'total', category:cm['Land'], address:{line1:'Shadnagar NH44',city:'Hyderabad',state:'Telangana',zipCode:'509216'}, features:{bedrooms:0,bathrooms:0,landArea:5,carpetArea:0,furnished:'unfurnished'}, amenities:['Road Access','Water Source','Fencing'], status:'available', isFeatured:false, description:'5-acre fertile agricultural land with borewell on NH44.' },
    { title:'Farm Land in Kolar Karnataka', type:'land', listingType:'sale', price:5000000, priceUnit:'total', category:cm['Land'], address:{line1:'Bethamangala Road Kolar',city:'Bangalore',state:'Karnataka',zipCode:'563101'}, features:{bedrooms:0,bathrooms:0,landArea:8,carpetArea:0,furnished:'unfurnished'}, amenities:['Electricity','Borewell','Road Access'], status:'available', isFeatured:false, description:'8-acre farmland with existing mango grove and borewell.' },
    { title:'Industrial Land in Patancheru', type:'land', listingType:'sale', price:12000000, priceUnit:'total', category:cm['Land'], address:{line1:'IDA Patancheru',city:'Hyderabad',state:'Telangana',zipCode:'502319'}, features:{bedrooms:0,bathrooms:0,landArea:2,carpetArea:0,furnished:'unfurnished'}, amenities:['Road Access','Power Connection','Industrial Zone'], status:'available', isFeatured:true, description:'2-acre industrial land in IDA Patancheru approved zone.' },
    { title:'Residential Plot in Kompally', type:'plot', listingType:'sale', price:4200000, priceUnit:'total', category:cm['Plot'], address:{line1:'Kompally Medchal Road',city:'Hyderabad',state:'Telangana',zipCode:'500014'}, features:{bedrooms:0,bathrooms:0,carpetArea:200,furnished:'unfurnished'}, amenities:['Clear Title','Road Access','Water Connection'], status:'available', isFeatured:true, description:'200 sq yard plot in HMDA-approved layout in Kompally.' },
    { title:'Corner Plot in Electronic City', type:'plot', listingType:'sale', price:6500000, priceUnit:'total', category:cm['Plot'], address:{line1:'Phase 2 Electronic City',city:'Bangalore',state:'Karnataka',zipCode:'560100'}, features:{bedrooms:0,bathrooms:0,carpetArea:240,furnished:'unfurnished'}, amenities:['BDA Approved','Road Access','Electricity'], status:'available', isFeatured:false, description:'BDA-approved corner plot in Electronic City Phase 2.' },
    { title:'Gated Community Plot in Shamshabad', type:'plot', listingType:'sale', price:3800000, priceUnit:'total', category:cm['Plot'], address:{line1:'Shamshabad Near Airport',city:'Hyderabad',state:'Telangana',zipCode:'501218'}, features:{bedrooms:0,bathrooms:0,carpetArea:150,furnished:'unfurnished'}, amenities:['DTCP Approved','24hr Security','Park'], status:'available', isFeatured:false, description:'DTCP-approved plot in secured gated community near airport.' },
    { title:'PG for Working Men near HITEC City', type:'pg', listingType:'rent', price:7500, priceUnit:'month', category:cm['PG'], address:{line1:'Madhapur HITEC City',city:'Hyderabad',state:'Telangana',zipCode:'500081'}, features:{bedrooms:1,bathrooms:1,carpetArea:150,furnished:'furnished'}, amenities:['WiFi','Meals Included','Laundry','AC Room'], status:'available', isFeatured:false, description:'Comfortable PG for IT professionals near HITEC City with meals.' },
    { title:'Ladies PG in Koramangala', type:'pg', listingType:'rent', price:9000, priceUnit:'month', category:cm['PG'], address:{line1:'4th Block Koramangala',city:'Bangalore',state:'Karnataka',zipCode:'560034'}, features:{bedrooms:1,bathrooms:1,carpetArea:130,furnished:'furnished'}, amenities:['WiFi','Meals','Security','Housekeeping'], status:'available', isFeatured:false, description:'Premium ladies-only PG in Koramangala with all amenities.' },
    { title:'Ultra-Luxury Penthouse in Worli', type:'apartment', listingType:'sale', price:120000000, priceUnit:'total', category:cm['Luxury'], address:{line1:'Lodha Altamount Worli',city:'Mumbai',state:'Maharashtra',zipCode:'400030'}, features:{bedrooms:5,bathrooms:6,carpetArea:8000,furnished:'furnished'}, amenities:['Private Pool','360 View','Home Automation','Private Elevator','Concierge'], status:'available', isFeatured:true, description:'Iconic super-luxury penthouse with uninterrupted sea views.' },
    { title:'Luxury Golf Villa in Kochi', type:'villa', listingType:'sale', price:55000000, priceUnit:'total', category:cm['Luxury'], address:{line1:'Bolgatty Island Mulavukad',city:'Kochi',state:'Kerala',zipCode:'682504'}, features:{bedrooms:6,bathrooms:7,carpetArea:7200,furnished:'furnished'}, amenities:['Golf Course Access','Boat Jetty','Pool','Smart Home','Spa Room'], status:'available', isFeatured:true, description:'Rare luxury villa facing the backwaters of Kerala.' },
    { title:'5-Star Serviced Apartment Banjara Hills', type:'apartment', listingType:'rent', price:200000, priceUnit:'month', category:cm['Luxury'], address:{line1:'Road No 1 Banjara Hills',city:'Hyderabad',state:'Telangana',zipCode:'500034'}, features:{bedrooms:4,bathrooms:5,carpetArea:5000,furnished:'furnished'}, amenities:['Butler Service','Private Pool','Gym','Home Theatre'], status:'available', isFeatured:true, description:'World-class serviced apartment with 5-star amenities in Banjara Hills.' },
    { title:'Luxury Farmhouse in Chattarpur Delhi', type:'villa', listingType:'rent', price:350000, priceUnit:'month', category:cm['Luxury'], address:{line1:'Chattarpur Extension',city:'Delhi',state:'Delhi',zipCode:'110074'}, features:{bedrooms:6,bathrooms:7,carpetArea:9000,furnished:'furnished'}, amenities:['Landscaped Gardens','Pool','Tennis Court','Helipad','Security'], status:'available', isFeatured:true, description:'Grand luxury farmhouse in Delhi elite Chattarpur belt.' },
    { title:'Heritage Bungalow in Pali Hill Bandra', type:'house', listingType:'sale', price:350000000, priceUnit:'total', category:cm['Luxury'], address:{line1:'Pali Hill Bandra West',city:'Mumbai',state:'Maharashtra',zipCode:'400050'}, features:{bedrooms:7,bathrooms:8,carpetArea:12000,furnished:'furnished'}, amenities:['Sea View','Private Garden','Library','Wine Room','Private Cinema'], status:'available', isFeatured:true, description:'One-of-a-kind heritage colonial bungalow in Bollywood coveted Pali Hill.' },
  ];

  for (const p of props) {
    try {
      const exists = await Property.findOne({ title: p.title });
      if (exists) { results.properties.skipped++; continue; }
      await Property.create({ ...p, isActive: true, views: Math.floor(Math.random()*500) });
      results.properties.created++;
    } catch(e) { results.errors.push(`Property ${p.title}: ${e.message}`); }
  }

  res.json({ success: true, summary: results });
});

router.get('/models', async (req, res) => {
  try {
    const r = await axios.get(`${GEMINI_BASE}/v1beta/models`, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
    });
    const names = r.data.models?.map(m => m.name) || [];
    res.json({ models: names });
  } catch (err) {
    res.json({ error: err.response?.data?.error?.message || err.message });
  }
});

const CHAT_LANGUAGES = { 'en-IN': 'English', 'hi-IN': 'Hindi', 'te-IN': 'Telugu' };

router.post('/chat', aiLimiter, optionalAuth, async (req, res) => {
  const chatStart = Date.now();
  const { messages, language } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: 'messages array is required' });
  }
  const languageName = CHAT_LANGUAGES[language];

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

    // Last message is the current user input
    const lastMsg = messages[messages.length - 1];
    const userText = lastMsg.content;

    // Voice feature: when the caller (client-user/src/components/AIChat.js)
    // sends a non-English language selection, instruct the model to reply
    // entirely in that language while leaving factual/identifying data
    // (names, addresses, contact info, links, currency) untouched. Omitted
    // or 'en-IN' language leaves the prompt exactly as before.
    const languageInstruction = languageName && languageName !== 'English'
      ? `\n\nIMPORTANT: Reply ONLY in ${languageName}. Keep the response natural and conversational, entirely in ${languageName} — do not mix languages. Do not translate unless the user explicitly asks you to. Keep property names, apartment names, street names, addresses, phone numbers, email addresses, URLs, Google Maps links, and currency values unchanged (do not translate or transliterate these) — only translate descriptive/conversational text into ${languageName}.`
      : '';

    // Inject system prompt + context as a synthetic first exchange
    const systemTurn = [
      { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}${languageInstruction}\n\n${contextBlock}\n\nAcknowledge you understand your role.` }] },
      { role: 'model', parts: [{ text: 'Understood. I am PMA Smart AI Assistant, ready to help with property search, lease details, payments, and platform navigation using the provided data.' }] },
    ];

    const body = {
      contents: [
        ...systemTurn,
        ...history,
        { role: 'user', parts: [{ text: userText }] },
      ],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    };

    const geminiRes = await axios.post(
      GEMINI_URL,
      body,
      { timeout: 30000, headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY } }
    );

    const text = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text) send({ type: 'delta', text });

    send({ type: 'done' });
    logAiQuery({ feature: 'chat', language, success: true, latencyMs: Date.now() - chatStart });
    res.end();
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('AI chat error:', JSON.stringify(detail));
    const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
    send({ type: 'error', message: `AI error: ${errMsg}` });
    logAiQuery({ feature: 'chat', language, success: false, latencyMs: Date.now() - chatStart, errorMessage: errMsg });
    res.end();
  }
});

// POST /api/ai/generate-description — draft marketing copy for a property.
// Works on both saved properties (propertyId) and in-progress drafts (raw
// fields from the create form) so it's usable before the property exists.
router.post('/generate-description', aiLimiter, adminProtect, async (req, res) => {
  const start = Date.now();
  const { title, type, listingType, city, state, features, amenities } = req.body;
  if (!title || !type) {
    return res.status(400).json({ success: false, message: 'title and type are required' });
  }

  const details = [
    `Title: ${title}`,
    `Type: ${type}`,
    listingType && `Listing: For ${listingType === 'rent' ? 'Rent' : 'Sale'}`,
    city && `Location: ${city}${state ? ', ' + state : ''}`,
    features?.bedrooms && `Bedrooms: ${features.bedrooms}`,
    features?.bathrooms && `Bathrooms: ${features.bathrooms}`,
    features?.carpetArea && `Carpet Area: ${features.carpetArea} sqft`,
    features?.furnished && `Furnishing: ${features.furnished}`,
    amenities?.length && `Amenities: ${amenities.join(', ')}`,
  ].filter(Boolean).join('\n');

  const prompt = `Write a compelling, factual real-estate listing description (120-180 words) for the following property. Use only the details given — do not invent amenities, prices, or features not listed. Write in a warm, professional tone suitable for a property listing website. Return only the description text, no headings or markdown.\n\n${details}`;

  try {
    const description = await generateText(prompt);
    logAiQuery({ feature: 'description', referenceModel: 'Property', admin: req.admin._id, success: true, latencyMs: Date.now() - start });
    res.json({ success: true, description: description.trim() });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
    logAiQuery({ feature: 'description', referenceModel: 'Property', admin: req.admin._id, success: false, latencyMs: Date.now() - start, errorMessage: errMsg });
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

// GET /api/ai/duplicate-check — heuristic (no AI call) scan for likely
// duplicate listings. String/numeric matching problem, not a language-
// understanding one, so this stays a direct query rather than a Gemini call.
router.get('/duplicate-check', adminProtect, async (req, res) => {
  try {
    const { title, city, type, price, excludeId } = req.query;
    if (!title || !city || !type) {
      return res.status(400).json({ success: false, message: 'title, city, and type are required' });
    }

    const query = { isActive: true, type, 'address.city': new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    if (excludeId) query._id = { $ne: excludeId };

    const candidates = await Property.find(query)
      .select('title propertyCode price address.city type')
      .limit(200)
      .lean();

    const numericPrice = Number(price) || null;
    const matches = candidates
      .map(c => {
        const titleScore = titleSimilarity(title, c.title);
        const priceClose = numericPrice && c.price
          ? Math.abs(c.price - numericPrice) / Math.max(c.price, numericPrice) <= 0.15
          : false;
        return { property: c, titleScore, priceClose };
      })
      .filter(m => m.titleScore >= 0.5 || (m.titleScore >= 0.3 && m.priceClose))
      .sort((a, b) => b.titleScore - a.titleScore)
      .slice(0, 3)
      .map(m => ({
        propertyId: m.property._id,
        title: m.property.title,
        propertyCode: m.property.propertyCode,
        price: m.property.price,
        similarity: Math.round(m.titleScore * 100),
      }));

    res.json({ success: true, matches });
  } catch (err) {
    res.status(500).json({ success: false, message: sanitizeError(err) });
  }
});

module.exports = router;
