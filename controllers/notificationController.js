const Notification = require('../models/Notification');
const DeviceToken = require('../models/DeviceToken');
const { pushNotification } = require('../services/firebaseNotificationService');
const { visibleAudiences } = require('../utils/notificationAudience');

const visibleTo = user => user.role === 'admin'
  ? { $or: [{ recipientRole: 'admin' }, { recipient: user._id }, { recipient: { $exists: false }, recipientRole: { $exists: false } }] }
  : { $or: [{ recipient: user._id }, { recipient: { $exists: false }, recipientRole: { $exists: false }, audience: { $in: visibleAudiences(user.type) } }] };

exports.createNotification = async (req, res) => {
  try {
    const { title, body, titleHindi = '', bodyHindi = '', type = 'general', audience = 'all', link = '' } = req.body;
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ success: false, message: 'Title and message are required' });
    const notification = await Notification.create({ title, body, titleHindi, bodyHindi, type, audience, link, createdBy: req.user._id });
    const push = await pushNotification(notification).catch(() => ({ sent: 0, failed: true }));
    res.status(201).json({ success: true, data: notification, push });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const data = await Notification.find(visibleTo(req.user)).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: data.map(item => ({ ...item, isRead: item.readBy.some(id => id.toString() === req.user._id.toString()) })) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.markRead = async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, ...visibleTo(req.user) }, { $addToSet: { readBy: req.user._id } });
  res.json({ success: true });
};

exports.registerToken = async (req, res) => {
  try {
    const { token, platform = 'web', language = 'en' } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Device token is required' });
    await DeviceToken.findOneAndUpdate({ token }, { user: req.user._id, platform, language }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
