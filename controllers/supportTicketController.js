const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const { getPublicR2Url } = require('../config/r2');

const filesFrom = req => (req.files || []).map(file => ({
  url: getPublicR2Url(file) || file.location,
  key: file.key || '',
  name: file.originalname,
  mime: file.mimetype
}));

const serialize = ticket => {
  const item = ticket.toObject ? ticket.toObject() : ticket;
  return { ...item, lastMessage: item.messages[item.messages.length - 1] };
};

const notifyTicketMessage = async (ticket, req, senderRole) => {
  const actorName = req.user.fullName || (senderRole === 'admin' ? 'Support Team' : 'Student');
  const notification = {
    title: senderRole === 'admin' ? 'Support replied to your ticket' : 'New support ticket message',
    body: `${actorName} replied to "${ticket.subject}".`.slice(0, 500),
    type: 'general',
    audience: 'all',
    link: `/support-tickets?id=${ticket._id}`,
    createdBy: req.user._id
  };
  if (senderRole === 'admin') {
    notification.recipient = ticket.createdBy._id || ticket.createdBy;
    notification.recipientRole = 'student';
  } else {
    notification.recipientRole = 'admin';
  }
  await Notification.create(notification);
};

const owned = async (req) => {
  const ticket = await SupportTicket.findById(req.params.id).populate('createdBy', 'fullName email phone profileImage').populate('messages.by', 'fullName role profileImage');
  if (!ticket) { const error = new Error('Ticket not found.'); error.status = 404; throw error; }
  if (req.user.role !== 'admin' && String(ticket.createdBy._id || ticket.createdBy) !== String(req.user._id)) {
    const error = new Error('You can only view your own tickets.'); error.status = 403; throw error;
  }
  return ticket;
};

exports.createTicket = async (req, res) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const body = String(req.body.body || req.body.description || '').trim();
    if (!subject || !body) return res.status(400).json({ success: false, message: 'Subject and message are required.' });
    const ticket = await SupportTicket.create({
      subject,
      createdBy: req.user._id,
      messages: [{ by: req.user._id, role: 'student', body, attachments: filesFrom(req) }]
    });
    try { await notifyTicketMessage(ticket, req, 'student'); }
    catch (error) { console.error('Unable to create support-ticket notification:', error); }
    res.status(201).json({ success: true, data: serialize(ticket) });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.listTickets = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    if (req.query.status && ['open', 'in_progress', 'closed'].includes(req.query.status)) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      SupportTicket.find(filter).populate('createdBy', 'fullName email phone profileImage').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
      SupportTicket.countDocuments(filter)
    ]);
    res.json({ success: true, data: items.map(serialize), pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total } });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.getTicket = async (req, res) => {
  try {
    res.json({ success: true, data: serialize(await owned(req)) });
  } catch (error) { res.status(error.status || 400).json({ success: false, message: error.message }); }
};

exports.replyTicket = async (req, res) => {
  try {
    const ticket = await owned(req);
    const body = String(req.body.body || '').trim();
    if (!body && !filesFrom(req).length) return res.status(400).json({ success: false, message: 'Reply text or an attachment is required.' });
    if (ticket.status === 'closed' && req.user.role !== 'admin') return res.status(400).json({ success: false, message: 'This ticket is closed.' });
    ticket.messages.push({ by: req.user._id, role: req.user.role === 'admin' ? 'admin' : 'student', body: body || 'Attachment', attachments: filesFrom(req) });
    if (req.user.role === 'admin' && ticket.status === 'open') ticket.status = 'in_progress';
    await ticket.save();
    try { await notifyTicketMessage(ticket, req, req.user.role === 'admin' ? 'admin' : 'student'); }
    catch (error) { console.error('Unable to create support-ticket notification:', error); }
    res.json({ success: true, data: serialize(ticket) });
  } catch (error) { res.status(error.status || 400).json({ success: false, message: error.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    if (!['open', 'in_progress', 'closed'].includes(req.body.status)) return res.status(400).json({ success: false, message: 'Status must be open, in_progress or closed.' });
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).populate('createdBy', 'fullName email phone profileImage');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    res.json({ success: true, data: serialize(ticket) });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
