/**
 * Seed Support Tickets, Contact Enquiries, and Subscribers Data
 */

export const initialSupportTickets = [
  {
    id: "TICK-101",
    ticketNumber: "TICK-101",
    customerName: "Aarav Sharma",
    customerEmail: "aarav.sharma@example.com",
    subject: "Dosage query for Triphala Churna",
    message: "Should Triphala Churna be taken with lukewarm water before bedtime, or in the morning?",
    priority: "medium",
    status: "in_progress",
    category: "Product Usage",
    createdAt: "2025-10-10T14:30:00Z",
    internalNotes: "Assigned to Dr. Rajesh. Advised lukewarm water at bedtime.",
  },
  {
    id: "TICK-102",
    ticketNumber: "TICK-102",
    customerName: "Priya S.",
    customerEmail: "priya.s@example.com",
    subject: "Expedited shipping request to Bengaluru",
    message: "Need order DA-981240 delivered before Saturday for travel.",
    priority: "high",
    status: "resolved",
    category: "Delivery",
    createdAt: "2025-10-11T09:15:00Z",
    internalNotes: "Dispatched via Bluedart Priority. Delivered Friday afternoon.",
  },
  {
    id: "TICK-103",
    ticketNumber: "TICK-103",
    customerName: "Rahul Mehta",
    customerEmail: "rahul.m@example.com",
    subject: "Return request - unbroken bottle seal",
    message: "Accidentally ordered two bottles of Mahanarayan Tailam instead of one.",
    priority: "low",
    status: "new",
    category: "Returns",
    createdAt: "2025-10-13T16:00:00Z",
    internalNotes: "Check return eligibility under 7-day policy.",
  },
];

export const initialContactEnquiries = [
  {
    id: "enq-001",
    name: "Dr. Sandeep Kulkarni",
    email: "dr.sandeep@kulkarniayurveda.in",
    phone: "+91 94220 33445",
    subject: "Wholesale & Bulk",
    message: "We run an integrated Panchakarma center in Nashik. We wish to order 50kg monthly bulk Lakadong Turmeric and Dhanwantaram oil.",
    status: "new",
    submittedAt: "2025-10-12T11:45:00Z",
    internalNotes: "",
  },
  {
    id: "enq-002",
    name: "Meera Sen",
    email: "meera.sen@gmail.com",
    phone: "+91 98300 77112",
    subject: "Dosha Guidance",
    message: "I experience high Pitta burning sensation in summer. What churna would you recommend?",
    status: "in_progress",
    submittedAt: "2025-10-11T15:20:00Z",
    internalNotes: "Recommended Avipattikar Churna and Pure Aloe Vera Gel.",
  },
  {
    id: "enq-003",
    name: "Kunal Deshmukh",
    email: "kunal.deshmukh@yahoo.com",
    phone: "+91 98200 44556",
    subject: "Product Inquiry",
    message: "Is your Himalayan Shilajit heavy metal lab tested? Can I see the batch certificate?",
    status: "resolved",
    submittedAt: "2025-10-09T10:10:00Z",
    internalNotes: "Emailed NABL batch analysis report showing heavy metals well below Ayush limits.",
  },
];

export const initialSubscribers = [
  {
    id: "sub-001",
    email: "priya.wellness@gmail.com",
    subscribedAt: "2025-08-14T09:30:00Z",
    source: "Homepage Footer",
    status: "active",
  },
  {
    id: "sub-002",
    email: "vikram.ayur@heritage.org",
    subscribedAt: "2025-08-20T14:15:00Z",
    source: "Ayurveda Guide Banner",
    status: "active",
  },
  {
    id: "sub-003",
    email: "ananya.sen@outlook.com",
    subscribedAt: "2025-09-02T11:00:00Z",
    source: "Checkout Opt-in",
    status: "active",
  },
  {
    id: "sub-004",
    email: "rohan.mehta@corp.in",
    subscribedAt: "2025-09-18T16:20:00Z",
    source: "Homepage Footer",
    status: "active",
  },
];

