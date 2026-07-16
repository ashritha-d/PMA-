require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Property = require('./models/Property');
const Category = require('./models/Category');

const MONGO_URI = process.env.MONGO_URI;

// ── USERS ──────────────────────────────────────────────────────────────────
const USERS = [
  { firstName:'Arjun',    lastName:'Sharma',    email:'arjun.sharma@gmail.com',    phone:'9876543210', password:'Demo@1234' },
  { firstName:'Priya',    lastName:'Reddy',     email:'priya.reddy@gmail.com',     phone:'9876543211', password:'Demo@1234' },
  { firstName:'Rohit',    lastName:'Mehta',     email:'rohit.mehta@gmail.com',     phone:'9876543212', password:'Demo@1234' },
  { firstName:'Sneha',    lastName:'Patel',     email:'sneha.patel@gmail.com',     phone:'9876543213', password:'Demo@1234' },
  { firstName:'Vikram',   lastName:'Nair',      email:'vikram.nair@gmail.com',     phone:'9876543214', password:'Demo@1234' },
  { firstName:'Divya',    lastName:'Iyer',      email:'divya.iyer@gmail.com',      phone:'9876543215', password:'Demo@1234' },
  { firstName:'Karthik',  lastName:'Kumar',     email:'karthik.kumar@gmail.com',   phone:'9876543216', password:'Demo@1234' },
  { firstName:'Ananya',   lastName:'Singh',     email:'ananya.singh@gmail.com',    phone:'9876543217', password:'Demo@1234' },
  { firstName:'Rahul',    lastName:'Verma',     email:'rahul.verma@gmail.com',     phone:'9876543218', password:'Demo@1234' },
  { firstName:'Meera',    lastName:'Joshi',     email:'meera.joshi@gmail.com',     phone:'9876543219', password:'Demo@1234' },
  { firstName:'Suresh',   lastName:'Pillai',    email:'suresh.pillai@gmail.com',   phone:'9876543220', password:'Demo@1234' },
  { firstName:'Lakshmi',  lastName:'Rao',       email:'lakshmi.rao@gmail.com',     phone:'9876543221', password:'Demo@1234' },
  { firstName:'Aditya',   lastName:'Bose',      email:'aditya.bose@gmail.com',     phone:'9876543222', password:'Demo@1234' },
  { firstName:'Pooja',    lastName:'Gupta',     email:'pooja.gupta@gmail.com',     phone:'9876543223', password:'Demo@1234' },
  { firstName:'Nikhil',   lastName:'Desai',     email:'nikhil.desai@gmail.com',    phone:'9876543224', password:'Demo@1234' },
  { firstName:'Kavitha',  lastName:'Menon',     email:'kavitha.menon@gmail.com',   phone:'9876543225', password:'Demo@1234' },
  { firstName:'Sanjay',   lastName:'Tiwari',    email:'sanjay.tiwari@gmail.com',   phone:'9876543226', password:'Demo@1234' },
  { firstName:'Deepika',  lastName:'Chopra',    email:'deepika.chopra@gmail.com',  phone:'9876543227', password:'Demo@1234' },
  { firstName:'Manoj',    lastName:'Pandey',    email:'manoj.pandey@gmail.com',    phone:'9876543228', password:'Demo@1234' },
  { firstName:'Shruti',   lastName:'Agarwal',   email:'shruti.agarwal@gmail.com',  phone:'9876543229', password:'Demo@1234' },
  { firstName:'Harish',   lastName:'Krishnan',  email:'harish.krishnan@gmail.com', phone:'9876543230', password:'Demo@1234' },
  { firstName:'Nisha',    lastName:'Bajaj',     email:'nisha.bajaj@gmail.com',     phone:'9876543231', password:'Demo@1234' },
  { firstName:'Ravi',     lastName:'Shankar',   email:'ravi.shankar@gmail.com',    phone:'9876543232', password:'Demo@1234' },
  { firstName:'Geeta',    lastName:'Malhotra',  email:'geeta.malhotra@gmail.com',  phone:'9876543233', password:'Demo@1234' },
  { firstName:'Praveen',  lastName:'Shetty',    email:'praveen.shetty@gmail.com',  phone:'9876543234', password:'Demo@1234' },
];

// ── CATEGORIES ─────────────────────────────────────────────────────────────
const CATEGORY_NAMES = [
  'Apartment','Villa','House','Commercial','Office','Shop','Land','Plot','PG','Luxury'
];

// ── PROPERTY DATA ──────────────────────────────────────────────────────────
function makeProperties(cats) {
  const catMap = {};
  cats.forEach(c => { catMap[c.name] = c._id; });

  const cities = ['Hyderabad','Bangalore','Mumbai','Chennai','Pune','Delhi','Ahmedabad','Kolkata','Jaipur','Kochi'];
  const states = { Hyderabad:'Telangana', Bangalore:'Karnataka', Mumbai:'Maharashtra', Chennai:'Tamil Nadu', Pune:'Maharashtra', Delhi:'Delhi', Ahmedabad:'Gujarat', Kolkata:'West Bengal', Jaipur:'Rajasthan', Kochi:'Kerala' };

  return [
    // APARTMENTS (8)
    { title:'Spacious 2BHK in Banjara Hills', type:'apartment', listingType:'rent', price:22000, priceUnit:'month', category:catMap['Apartment'], address:{line1:'Flat 301, Prestige Tower', city:'Hyderabad', state:'Telangana', zipCode:'500034'}, features:{bedrooms:2,bathrooms:2,carpetArea:1050,furnished:'semi-furnished'}, amenities:['Lift','Security','Power Backup','Car Parking'], status:'available', isFeatured:true, description:'Well-maintained 2BHK apartment in prime Banjara Hills location. Close to schools, hospitals and malls.' },
    { title:'Modern 3BHK Apartment in Whitefield', type:'apartment', listingType:'rent', price:35000, priceUnit:'month', category:catMap['Apartment'], address:{line1:'Block B, Sobha City', city:'Bangalore', state:'Karnataka', zipCode:'560066'}, features:{bedrooms:3,bathrooms:2,carpetArea:1450,furnished:'furnished'}, amenities:['Swimming Pool','Gym','Lift','Security','Club House'], status:'available', isFeatured:true, description:'Premium furnished 3BHK with top-class amenities in Whitefield IT hub.' },
    { title:'Affordable 1BHK in Andheri East', type:'apartment', listingType:'rent', price:18000, priceUnit:'month', category:catMap['Apartment'], address:{line1:'Lotus Heights, Chakala', city:'Mumbai', state:'Maharashtra', zipCode:'400093'}, features:{bedrooms:1,bathrooms:1,carpetArea:620,furnished:'unfurnished'}, amenities:['Security','Power Backup'], status:'available', isFeatured:false, description:'Compact 1BHK ideal for working professionals near Andheri metro station.' },
    { title:'Luxury 4BHK Penthouse in OMR', type:'apartment', listingType:'sale', price:9500000, priceUnit:'total', category:catMap['Apartment'], address:{line1:'Prestige Towers, OMR', city:'Chennai', state:'Tamil Nadu', zipCode:'600119'}, features:{bedrooms:4,bathrooms:4,carpetArea:3200,furnished:'furnished'}, amenities:['Rooftop Pool','Private Terrace','Gym','Theatre Room','Concierge'], status:'available', isFeatured:true, description:'Ultra-luxury penthouse with panoramic city views in premium OMR corridor.' },
    { title:'Budget 2BHK near Hinjewadi IT Park', type:'apartment', listingType:'rent', price:17000, priceUnit:'month', category:catMap['Apartment'], address:{line1:'Green Valley Apts', city:'Pune', state:'Maharashtra', zipCode:'411057'}, features:{bedrooms:2,bathrooms:1,carpetArea:890,furnished:'semi-furnished'}, amenities:['Parking','Security','Garden'], status:'available', isFeatured:false, description:'Affordable 2BHK walking distance from Hinjewadi Phase 1 IT companies.' },
    { title:'Premium 3BHK in Gachibowli', type:'apartment', listingType:'sale', price:7800000, priceUnit:'total', category:catMap['Apartment'], address:{line1:'My Home Avatar', city:'Hyderabad', state:'Telangana', zipCode:'500032'}, features:{bedrooms:3,bathrooms:3,carpetArea:1850,furnished:'unfurnished'}, amenities:['Gym','Swimming Pool','Kids Zone','Security','Lift'], status:'available', isFeatured:true, description:'Ready-to-move 3BHK in the tech hub of Gachibowli. Excellent connectivity to HITEC City.' },
    { title:'Studio Apartment in Koramangala', type:'apartment', listingType:'rent', price:14000, priceUnit:'month', category:catMap['Apartment'], address:{line1:'Maple Residency, 5th Block', city:'Bangalore', state:'Karnataka', zipCode:'560095'}, features:{bedrooms:1,bathrooms:1,carpetArea:450,furnished:'furnished'}, amenities:['Security','WiFi','Power Backup'], status:'available', isFeatured:false, description:'Fully furnished studio apartment perfect for young professionals in the heart of Koramangala.' },
    { title:'2BHK Apartment near Airport, Delhi', type:'apartment', listingType:'rent', price:28000, priceUnit:'month', category:catMap['Apartment'], address:{line1:'Aerocity Residences', city:'Delhi', state:'Delhi', zipCode:'110037'}, features:{bedrooms:2,bathrooms:2,carpetArea:1100,furnished:'semi-furnished'}, amenities:['Lift','Security','Parking','Club House'], status:'available', isFeatured:false, description:'Convenient 2BHK near Indira Gandhi International Airport with metro connectivity.' },

    // VILLAS (6)
    { title:'4BHK Independent Villa in Jubilee Hills', type:'villa', listingType:'sale', price:28000000, priceUnit:'total', category:catMap['Villa'], address:{line1:'Road No. 36, Jubilee Hills', city:'Hyderabad', state:'Telangana', zipCode:'500033'}, features:{bedrooms:4,bathrooms:4,carpetArea:4200,furnished:'furnished'}, amenities:['Private Pool','Garden','Home Theatre','Modular Kitchen','Solar Panels'], status:'available', isFeatured:true, description:'Luxurious 4BHK independent villa with private swimming pool in prestigious Jubilee Hills.' },
    { title:'3BHK Villa in Sarjapur Road', type:'villa', listingType:'sale', price:18500000, priceUnit:'total', category:catMap['Villa'], address:{line1:'Adarsh Palm Retreat', city:'Bangalore', state:'Karnataka', zipCode:'560035'}, features:{bedrooms:3,bathrooms:3,carpetArea:2800,furnished:'semi-furnished'}, amenities:['Community Pool','Gym','Clubhouse','24hr Security'], status:'available', isFeatured:true, description:'Elegant 3BHK villa in gated community on Sarjapur Road with world-class amenities.' },
    { title:'5BHK Beach Villa in ECR', type:'villa', listingType:'sale', price:45000000, priceUnit:'total', category:catMap['Villa'], address:{line1:'East Coast Road, Neelankarai', city:'Chennai', state:'Tamil Nadu', zipCode:'600041'}, features:{bedrooms:5,bathrooms:5,carpetArea:5500,furnished:'furnished'}, amenities:['Beach Access','Private Pool','Jacuzzi','Home Automation','Guest Suite'], status:'available', isFeatured:true, description:'Stunning beachfront villa with direct sea access. Ideal as luxury holiday home or investment.' },
    { title:'Villa with Garden in Kothrud', type:'villa', listingType:'rent', price:65000, priceUnit:'month', category:catMap['Villa'], address:{line1:'Kothrud, Near Chandni Chowk', city:'Pune', state:'Maharashtra', zipCode:'411038'}, features:{bedrooms:4,bathrooms:3,carpetArea:3000,furnished:'furnished'}, amenities:['Garden','Garage','Security','Generator'], status:'available', isFeatured:false, description:'Spacious furnished villa with lush garden in serene Kothrud neighbourhood.' },
    { title:'Luxury Villa in Hitech City', type:'villa', listingType:'rent', price:90000, priceUnit:'month', category:catMap['Villa'], address:{line1:'Madhapur, HITEC City', city:'Hyderabad', state:'Telangana', zipCode:'500081'}, features:{bedrooms:5,bathrooms:5,carpetArea:4800,furnished:'furnished'}, amenities:['Private Pool','Smart Home','Home Theatre','Gym','Chef Kitchen'], status:'available', isFeatured:true, description:'Premium furnished villa ideal for senior executives. Fully smart-home enabled.' },
    { title:'3BHK Garden Villa in Whitefield', type:'villa', listingType:'sale', price:12000000, priceUnit:'total', category:catMap['Villa'], address:{line1:'Eden Garden Villas, Whitefield', city:'Bangalore', state:'Karnataka', zipCode:'560066'}, features:{bedrooms:3,bathrooms:3,carpetArea:2400,furnished:'unfurnished'}, amenities:['Community Garden','Clubhouse','Tennis Court','Security'], status:'available', isFeatured:false, description:'Beautiful 3BHK villa in a green gated community with excellent social infrastructure.' },

    // HOUSES (6)
    { title:'Independent 3BHK House in Dilsukhnagar', type:'house', listingType:'sale', price:6500000, priceUnit:'total', category:catMap['House'], address:{line1:'Plot 12, Dilsukhnagar', city:'Hyderabad', state:'Telangana', zipCode:'500036'}, features:{bedrooms:3,bathrooms:2,carpetArea:1600,furnished:'unfurnished'}, amenities:['Car Parking','Terrace','Generator'], status:'available', isFeatured:false, description:'Solid independent house with terrace in well-connected Dilsukhnagar area.' },
    { title:'2BHK House near Marathahalli', type:'house', listingType:'rent', price:16000, priceUnit:'month', category:catMap['House'], address:{line1:'Challaghatta Village', city:'Bangalore', state:'Karnataka', zipCode:'560037'}, features:{bedrooms:2,bathrooms:1,carpetArea:950,furnished:'unfurnished'}, amenities:['Parking','Water Supply'], status:'available', isFeatured:false, description:'Independent house for rent near Marathahalli bridge. Good water supply and connectivity.' },
    { title:'4BHK Duplex House in Navi Mumbai', type:'house', listingType:'sale', price:15000000, priceUnit:'total', category:catMap['House'], address:{line1:'Sector 15, Kharghar', city:'Mumbai', state:'Maharashtra', zipCode:'410210'}, features:{bedrooms:4,bathrooms:3,carpetArea:2600,furnished:'semi-furnished'}, amenities:['Parking','Garden','Security','Lift Access'], status:'available', isFeatured:true, description:'Spacious duplex house in Kharghar with sea view and proximity to golf course.' },
    { title:'Traditional Home in Alwarpet', type:'house', listingType:'sale', price:22000000, priceUnit:'total', category:catMap['House'], address:{line1:'3rd Cross Street, Alwarpet', city:'Chennai', state:'Tamil Nadu', zipCode:'600018'}, features:{bedrooms:4,bathrooms:3,carpetArea:2800,furnished:'unfurnished'}, amenities:['Car Parking','Puja Room','Terrace Garden'], status:'available', isFeatured:false, description:'Classic Tamil Nadu-style independent house in coveted Alwarpet locality.' },
    { title:'Budget 2BHK House in Miyapur', type:'house', listingType:'rent', price:10000, priceUnit:'month', category:catMap['House'], address:{line1:'Chandanagar, Miyapur', city:'Hyderabad', state:'Telangana', zipCode:'500050'}, features:{bedrooms:2,bathrooms:1,carpetArea:850,furnished:'unfurnished'}, amenities:['Parking','Borewell Water'], status:'available', isFeatured:false, description:'Affordable independent house in Miyapur with metro connectivity nearby.' },
    { title:'3BHK House in C V Raman Nagar', type:'house', listingType:'rent', price:24000, priceUnit:'month', category:catMap['House'], address:{line1:'CV Raman Nagar Main Road', city:'Bangalore', state:'Karnataka', zipCode:'560093'}, features:{bedrooms:3,bathrooms:2,carpetArea:1400,furnished:'semi-furnished'}, amenities:['Parking','Garden','Security'], status:'available', isFeatured:false, description:'Semi-furnished independent house in peaceful CV Raman Nagar ideal for families.' },

    // COMMERCIAL (5)
    { title:'Showroom Space on MG Road', type:'commercial', listingType:'rent', price:85000, priceUnit:'month', category:catMap['Commercial'], address:{line1:'MG Road Commercial Complex', city:'Bangalore', state:'Karnataka', zipCode:'560001'}, features:{bedrooms:0,bathrooms:2,carpetArea:2400,furnished:'unfurnished'}, amenities:['Power Backup','Parking','Security','Loading Bay'], status:'available', isFeatured:true, description:'Prime retail space on MG Road with high foot traffic. Ideal for showroom or flagship store.' },
    { title:'Commercial Space in Banjara Hills', type:'commercial', listingType:'sale', price:35000000, priceUnit:'total', category:catMap['Commercial'], address:{line1:'Road No. 12, Banjara Hills', city:'Hyderabad', state:'Telangana', zipCode:'500034'}, features:{bedrooms:0,bathrooms:3,carpetArea:3800,furnished:'unfurnished'}, amenities:['Parking','Security','Power Backup','Lifts'], status:'available', isFeatured:true, description:'Premium commercial property in Banjara Hills business district. Corner plot with high visibility.' },
    { title:'Retail Store in Phoenix Palladium Area', type:'commercial', listingType:'rent', price:120000, priceUnit:'month', category:catMap['Commercial'], address:{line1:'Lower Parel West', city:'Mumbai', state:'Maharashtra', zipCode:'400013'}, features:{bedrooms:0,bathrooms:1,carpetArea:1800,furnished:'unfurnished'}, amenities:['Security','Power Backup','AC'], status:'available', isFeatured:false, description:'High-visibility retail space near Phoenix Palladium in Lower Parel.' },
    { title:'Restaurant Space in Anna Nagar', type:'commercial', listingType:'rent', price:55000, priceUnit:'month', category:catMap['Commercial'], address:{line1:'2nd Avenue, Anna Nagar', city:'Chennai', state:'Tamil Nadu', zipCode:'600040'}, features:{bedrooms:0,bathrooms:4,carpetArea:2200,furnished:'unfurnished'}, amenities:['Exhaust Setup','Power Backup','Parking'], status:'available', isFeatured:false, description:'Ready-to-use restaurant space with kitchen setup area in busy Anna Nagar.' },
    { title:'Commercial Complex in SG Highway', type:'commercial', listingType:'sale', price:48000000, priceUnit:'total', category:catMap['Commercial'], address:{line1:'SG Highway, Makarba', city:'Ahmedabad', state:'Gujarat', zipCode:'380051'}, features:{bedrooms:0,bathrooms:6,carpetArea:6000,furnished:'unfurnished'}, amenities:['Parking','Security','Power Backup','CCTV'], status:'available', isFeatured:true, description:'Corner commercial complex on prime SG Highway with excellent road visibility.' },

    // OFFICES (5)
    { title:'Furnished Office in Cyber Towers', type:'office', listingType:'rent', price:150000, priceUnit:'month', category:catMap['Office'], address:{line1:'Cyber Towers, HITEC City', city:'Hyderabad', state:'Telangana', zipCode:'500081'}, features:{bedrooms:0,bathrooms:4,carpetArea:5000,furnished:'furnished'}, amenities:['High-Speed Internet','24hr AC','Security','Cafeteria','Reception'], status:'available', isFeatured:true, description:'Premium furnished office in iconic Cyber Towers. Ready to move-in with all infrastructure.' },
    { title:'Co-Working Seats in Indiranagar', type:'office', listingType:'rent', price:8000, priceUnit:'month', category:catMap['Office'], address:{line1:'100 Feet Road, Indiranagar', city:'Bangalore', state:'Karnataka', zipCode:'560038'}, features:{bedrooms:0,bathrooms:2,carpetArea:3000,furnished:'furnished'}, amenities:['High-Speed WiFi','Meeting Rooms','Cafeteria','Lounge'], status:'available', isFeatured:false, description:'Vibrant co-working space in Indiranagar with hot desks, dedicated seats and private cabins.' },
    { title:'Office Space in BKC', type:'office', listingType:'rent', price:280000, priceUnit:'month', category:catMap['Office'], address:{line1:'Bandra Kurla Complex', city:'Mumbai', state:'Maharashtra', zipCode:'400051'}, features:{bedrooms:0,bathrooms:6,carpetArea:8000,furnished:'semi-furnished'}, amenities:['Parking','Cafeteria','Security','Server Room','Reception'], status:'available', isFeatured:true, description:'Grade-A office space in BKC — Mumbai\'s prime financial district. Floor-to-ceiling windows.' },
    { title:'Startup Office in Koramangala', type:'office', listingType:'rent', price:45000, priceUnit:'month', category:catMap['Office'], address:{line1:'80 Feet Road, Koramangala', city:'Bangalore', state:'Karnataka', zipCode:'560034'}, features:{bedrooms:0,bathrooms:2,carpetArea:1500,furnished:'furnished'}, amenities:['WiFi','Meeting Room','Parking','24hr Access'], status:'available', isFeatured:false, description:'Compact furnished office perfect for early-stage startups in startup hub Koramangala.' },
    { title:'Corporate Office in Guindy', type:'office', listingType:'rent', price:95000, priceUnit:'month', category:catMap['Office'], address:{line1:'Industrial Estate, Guindy', city:'Chennai', state:'Tamil Nadu', zipCode:'600032'}, features:{bedrooms:0,bathrooms:4,carpetArea:4500,furnished:'semi-furnished'}, amenities:['Parking','Generator','Security','Cafeteria','Server Room'], status:'available', isFeatured:false, description:'Spacious corporate office in Guindy industrial zone. Excellent road and metro access.' },

    // SHOPS (4)
    { title:'Shop in Abids Commercial Area', type:'shop', listingType:'rent', price:25000, priceUnit:'month', category:catMap['Shop'], address:{line1:'Abids, Near GPO', city:'Hyderabad', state:'Telangana', zipCode:'500001'}, features:{bedrooms:0,bathrooms:1,carpetArea:400,furnished:'unfurnished'}, amenities:['Power Backup','Security Shutter'], status:'available', isFeatured:false, description:'Ground floor shop in busy Abids commercial hub. Ideal for electronics, clothing or pharmacy.' },
    { title:'Grocery Store Space in HSR Layout', type:'shop', listingType:'rent', price:30000, priceUnit:'month', category:catMap['Shop'], address:{line1:'Sector 1, HSR Layout', city:'Bangalore', state:'Karnataka', zipCode:'560102'}, features:{bedrooms:0,bathrooms:1,carpetArea:550,furnished:'unfurnished'}, amenities:['Power Backup','Parking','Cold Storage Room'], status:'available', isFeatured:false, description:'Well-located shop space in HSR Layout\'s busiest commercial street. High residential catchment.' },
    { title:'Corner Shop in Juhu', type:'shop', listingType:'sale', price:8500000, priceUnit:'total', category:catMap['Shop'], address:{line1:'Juhu Tara Road', city:'Mumbai', state:'Maharashtra', zipCode:'400049'}, features:{bedrooms:0,bathrooms:1,carpetArea:700,furnished:'unfurnished'}, amenities:['Air Conditioning','Power Backup'], status:'available', isFeatured:true, description:'Prominent corner shop in upscale Juhu. Perfect for boutique, cafe or salon.' },
    { title:'Pharmacy Shop near KIMS Hospital', type:'shop', listingType:'rent', price:20000, priceUnit:'month', category:catMap['Shop'], address:{line1:'Minister Road, Secunderabad', city:'Hyderabad', state:'Telangana', zipCode:'500003'}, features:{bedrooms:0,bathrooms:1,carpetArea:320,furnished:'unfurnished'}, amenities:['AC','Security Shutter','Power Backup'], status:'available', isFeatured:false, description:'Ready-to-use shop space near KIMS Hospital. Ideal for pharmacy or diagnostics.' },

    // LAND (4)
    { title:'Agricultural Land in Shadnagar', type:'land', listingType:'sale', price:3500000, priceUnit:'total', category:catMap['Land'], address:{line1:'Shadnagar, NH44', city:'Hyderabad', state:'Telangana', zipCode:'509216'}, features:{bedrooms:0,bathrooms:0,landArea:5,carpetArea:0,furnished:'unfurnished'}, amenities:['Road Access','Water Source','Fencing'], status:'available', isFeatured:false, description:'5-acre fertile agricultural land with borewell and road access on NH44.' },
    { title:'Farm Land in Kolar', type:'land', listingType:'sale', price:5000000, priceUnit:'total', category:catMap['Land'], address:{line1:'Bethamangala Road, Kolar', city:'Bangalore', state:'Karnataka', zipCode:'563101'}, features:{bedrooms:0,bathrooms:0,landArea:8,carpetArea:0,furnished:'unfurnished'}, amenities:['Electricity','Borewell','Road Access'], status:'available', isFeatured:false, description:'8-acre farmland with existing mango grove. Electricity and borewell available.' },
    { title:'Industrial Land in Patancheru', type:'land', listingType:'sale', price:12000000, priceUnit:'total', category:catMap['Land'], address:{line1:'IDA Patancheru', city:'Hyderabad', state:'Telangana', zipCode:'502319'}, features:{bedrooms:0,bathrooms:0,landArea:2,carpetArea:0,furnished:'unfurnished'}, amenities:['Road Access','Power Connection','Industrial Zone'], status:'available', isFeatured:true, description:'2-acre industrial land in IDA Patancheru approved zone. Ready for factory setup.' },
    { title:'Agricultural Plot in Jaipur Outskirts', type:'land', listingType:'sale', price:2800000, priceUnit:'total', category:catMap['Land'], address:{line1:'Chomu Road', city:'Jaipur', state:'Rajasthan', zipCode:'303702'}, features:{bedrooms:0,bathrooms:0,landArea:4,carpetArea:0,furnished:'unfurnished'}, amenities:['Road Access','Water Canal Nearby'], status:'available', isFeatured:false, description:'4-acre agricultural land near Chomu road with canal water access. Great investment.' },

    // PLOTS (4)
    { title:'Residential Plot in Kompally', type:'plot', listingType:'sale', price:4200000, priceUnit:'total', category:catMap['Plot'], address:{line1:'Kompally, Medchal Road', city:'Hyderabad', state:'Telangana', zipCode:'500014'}, features:{bedrooms:0,bathrooms:0,carpetArea:200,furnished:'unfurnished'}, amenities:['Clear Title','Road Access','Water Connection'], status:'available', isFeatured:true, description:'200 sq yard plot in HMDA-approved layout in fast-growing Kompally.' },
    { title:'Corner Plot in Electronic City', type:'plot', listingType:'sale', price:6500000, priceUnit:'total', category:catMap['Plot'], address:{line1:'Phase 2, Electronic City', city:'Bangalore', state:'Karnataka', zipCode:'560100'}, features:{bedrooms:0,bathrooms:0,carpetArea:240,furnished:'unfurnished'}, amenities:['BDA Approved','Road Access','Electricity'], status:'available', isFeatured:false, description:'BDA-approved corner plot in Electronic City Phase 2. Ready for immediate construction.' },
    { title:'Gated Community Plot in Shamshabad', type:'plot', listingType:'sale', price:3800000, priceUnit:'total', category:catMap['Plot'], address:{line1:'Shamshabad, Near Airport', city:'Hyderabad', state:'Telangana', zipCode:'501218'}, features:{bedrooms:0,bathrooms:0,carpetArea:150,furnished:'unfurnished'}, amenities:['DTCP Approved','24hr Security','Underground Cabling','Park'], status:'available', isFeatured:false, description:'DTCP-approved plot in secured gated community near Rajiv Gandhi International Airport.' },
    { title:'NA Plot in Wagholi', type:'plot', listingType:'sale', price:2900000, priceUnit:'total', category:catMap['Plot'], address:{line1:'Wagholi, Nagar Road', city:'Pune', state:'Maharashtra', zipCode:'412207'}, features:{bedrooms:0,bathrooms:0,carpetArea:170,furnished:'unfurnished'}, amenities:['NA Converted','Road Access','Water Connection'], status:'available', isFeatured:false, description:'Non-agricultural converted plot with clear title in rapidly developing Wagholi.' },

    // PG (3)
    { title:'PG Accommodation for Working Men', type:'pg', listingType:'rent', price:7500, priceUnit:'month', category:catMap['PG'], address:{line1:'Madhapur, HITEC City', city:'Hyderabad', state:'Telangana', zipCode:'500081'}, features:{bedrooms:1,bathrooms:1,carpetArea:150,furnished:'furnished'}, amenities:['WiFi','Meals Included','Laundry','AC Room'], status:'available', isFeatured:false, description:'Comfortable PG for IT professionals near HITEC City. Includes breakfast and dinner.' },
    { title:'Ladies PG in Koramangala', type:'pg', listingType:'rent', price:9000, priceUnit:'month', category:catMap['PG'], address:{line1:'4th Block, Koramangala', city:'Bangalore', state:'Karnataka', zipCode:'560034'}, features:{bedrooms:1,bathrooms:1,carpetArea:130,furnished:'furnished'}, amenities:['WiFi','Meals','Security','Wardrobe','Housekeeping'], status:'available', isFeatured:false, description:'Premium ladies-only PG in Koramangala with all meals, housekeeping and 24hr security.' },
    { title:'PG with AC near Hinjewadi IT', type:'pg', listingType:'rent', price:8000, priceUnit:'month', category:catMap['PG'], address:{line1:'Wakad, Hinjewadi Road', city:'Pune', state:'Maharashtra', zipCode:'411057'}, features:{bedrooms:1,bathrooms:1,carpetArea:140,furnished:'furnished'}, amenities:['AC','WiFi','Meals','TV','Parking for Bikes'], status:'available', isFeatured:false, description:'Well-managed AC PG accommodation near Hinjewadi IT Park with food and laundry.' },

    // LUXURY (5)
    { title:'Ultra-Luxury Penthouse in Worli', type:'apartment', listingType:'sale', price:120000000, priceUnit:'total', category:catMap['Luxury'], address:{line1:'Lodha Altamount, Worli', city:'Mumbai', state:'Maharashtra', zipCode:'400030'}, features:{bedrooms:5,bathrooms:6,carpetArea:8000,furnished:'furnished'}, amenities:['Private Pool','360° View','Home Automation','Private Elevator','Concierge','Wine Cellar'], status:'available', isFeatured:true, description:'Iconic super-luxury penthouse in Lodha Altamount with uninterrupted sea views. Ultimate trophy asset.' },
    { title:'Luxury Golf Villa in Kochi', type:'villa', listingType:'sale', price:55000000, priceUnit:'total', category:catMap['Luxury'], address:{line1:'Bolgatty Island, Mulavukad', city:'Kochi', state:'Kerala', zipCode:'682504'}, features:{bedrooms:6,bathrooms:7,carpetArea:7200,furnished:'furnished'}, amenities:['Golf Course Access','Boat Jetty','Pool','Smart Home','Spa Room'], status:'available', isFeatured:true, description:'Rare luxury villa facing the backwaters of Kerala. Private boat jetty and golf course membership.' },
    { title:'5-Star Serviced Apartment in Banjara Hills', type:'apartment', listingType:'rent', price:200000, priceUnit:'month', category:catMap['Luxury'], address:{line1:'Road No. 1, Banjara Hills', city:'Hyderabad', state:'Telangana', zipCode:'500034'}, features:{bedrooms:4,bathrooms:5,carpetArea:5000,furnished:'furnished'}, amenities:['Butler Service','Private Pool','Gym','Home Theatre','Housekeeping'], status:'available', isFeatured:true, description:'World-class serviced apartment with butler and 5-star amenities in Banjara Hills.' },
    { title:'Luxury Farmhouse in Chattarpur', type:'villa', listingType:'rent', price:350000, priceUnit:'month', category:catMap['Luxury'], address:{line1:'Chattarpur Extension', city:'Delhi', state:'Delhi', zipCode:'110074'}, features:{bedrooms:6,bathrooms:7,carpetArea:9000,furnished:'furnished'}, amenities:['Landscaped Gardens','Pool','Tennis Court','Helipad','Generator','Security'], status:'available', isFeatured:true, description:'Grand luxury farmhouse in Delhi\'s elite Chattarpur belt. Suitable for high-profile corporate lets.' },
    { title:'Heritage Bungalow in Pali Hill', type:'house', listingType:'sale', price:350000000, priceUnit:'total', category:catMap['Luxury'], address:{line1:'Pali Hill, Bandra West', city:'Mumbai', state:'Maharashtra', zipCode:'400050'}, features:{bedrooms:7,bathrooms:8,carpetArea:12000,furnished:'furnished'}, amenities:['Sea View','Private Garden','Library','Wine Room','Staff Quarters','Private Cinema'], status:'available', isFeatured:true, description:'One-of-a-kind heritage colonial bungalow in Bollywood\'s most coveted address — Pali Hill, Bandra.' },
  ];
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  const results = { users: [], categories: [], properties: [], errors: [] };

  // 1. USERS
  console.log('── Creating Users ──────────────────────────────');
  for (const u of USERS) {
    try {
      const existing = await User.findOne({ email: u.email });
      if (existing) { console.log(`  SKIP  ${u.email} (already exists)`); results.users.push({ ...u, status: 'skipped' }); continue; }
      const hash = await bcrypt.hash(u.password, 10);
      const user = await User.create({ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, password: hash, isEmailVerified: true, status: 'active' });
      console.log(`  OK    ${u.firstName} ${u.lastName} <${u.email}>`);
      results.users.push({ ...u, id: user._id, status: 'created' });
    } catch (e) {
      console.log(`  ERR   ${u.email} — ${e.message}`);
      results.errors.push({ type: 'user', email: u.email, error: e.message });
    }
  }

  // 2. CATEGORIES
  console.log('\n── Creating Categories ─────────────────────────');
  const cats = [];
  for (const name of CATEGORY_NAMES) {
    try {
      let cat = await Category.findOne({ name });
      if (!cat) { cat = await Category.create({ name, slug: name.toLowerCase(), isActive: true }); console.log(`  OK    ${name}`); }
      else { console.log(`  SKIP  ${name} (already exists)`); }
      cats.push(cat);
    } catch (e) {
      console.log(`  ERR   ${name} — ${e.message}`);
      results.errors.push({ type: 'category', name, error: e.message });
    }
  }

  // 3. PROPERTIES
  console.log('\n── Creating Properties ─────────────────────────');
  const props = makeProperties(cats);
  for (const p of props) {
    try {
      const existing = await Property.findOne({ title: p.title });
      if (existing) { console.log(`  SKIP  ${p.title}`); results.properties.push({ title: p.title, status: 'skipped' }); continue; }
      const prop = await Property.create({ ...p, isActive: true, views: Math.floor(Math.random() * 500), createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) });
      console.log(`  OK    ${p.title}`);
      results.properties.push({ title: p.title, type: p.type, city: p.address.city, price: p.price, status: 'created', id: prop._id });
    } catch (e) {
      console.log(`  ERR   ${p.title} — ${e.message}`);
      results.errors.push({ type: 'property', title: p.title, error: e.message });
    }
  }

  // 4. SUMMARY
  const created = results.users.filter(u => u.status === 'created').length;
  const skippedU = results.users.filter(u => u.status === 'skipped').length;
  const createdP = results.properties.filter(p => p.status === 'created').length;
  const skippedP = results.properties.filter(p => p.status === 'skipped').length;

  console.log('\n═══════════════════════════════════════════════');
  console.log('  SEED SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Users    : ${created} created, ${skippedU} skipped`);
  console.log(`  Properties: ${createdP} created, ${skippedP} skipped`);
  console.log(`  Errors   : ${results.errors.length}`);
  console.log('');
  console.log('  USER CREDENTIALS (all passwords: Demo@1234)');
  console.log('  ──────────────────────────────────────────');
  console.log('  Name                     Email                          Phone');
  results.users.forEach(u => {
    console.log(`  ${(u.firstName+' '+u.lastName).padEnd(24)} ${u.email.padEnd(34)} ${u.phone}`);
  });
  console.log('');
  console.log('  PROPERTY SUMMARY BY TYPE');
  console.log('  ──────────────────────────────────────────');
  const byType = {};
  results.properties.forEach(p => { byType[p.type] = (byType[p.type]||0)+1; });
  Object.entries(byType).forEach(([t,n]) => console.log(`  ${t.padEnd(12)} ${n}`));
  console.log('═══════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
