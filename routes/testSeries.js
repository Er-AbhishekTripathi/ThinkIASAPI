const express = require('express');
const TestSeries = require('../models/TestSeries');
const { auth, adminAuth } = require('../middleware/auth');
const { publishSystemNotification } = require('../services/firebaseNotificationService');
const allowed = ['intro', 'introHi', 'name', 'nameHi', 'description', 'descriptionHi', 'startDate', 'endDate', 'testDates', 'isActive'];
const payload = body => Object.fromEntries(allowed.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
const serialize = item => ({ ...item.toObject(), totalTests: item.testDates.length });

module.exports = kind => {
  const router = express.Router();
  const handle = fn => async (req, res) => { try { await fn(req, res); } catch (error) { res.status(400).json({ success: false, message: error.message }); } };
  const notify = (item, user) => {
    if (!item.isActive) return;
    publishSystemNotification({ title: item.name.slice(0,120), titleHindi: item.nameHi.slice(0,120), body: item.description.slice(0,500), bodyHindi: item.descriptionHi.slice(0,500), type: 'test_series', audience: kind, link: kind === 'pre' ? '/prelims-test-series' : '/mains-test-series', createdBy: user._id }).catch(error => console.error('Series notification:', error.message));
  };
  router.use(auth);
  router.get('/student/:filter', handle(async (req, res) => {
    if (req.user.role !== 'admin' && ![kind, 'combo'].includes(req.user.type)) return res.status(403).json({ success: false, message: 'This test series requires the corresponding plan.' });
    const filter = { kind, isActive: true };
    if (req.params.filter === 'available') { filter.startDate = { $lte: new Date() }; filter.endDate = { $gte: new Date() }; }
    if (req.params.filter === 'upcoming') filter.startDate = { $gt: new Date() };
    const data = await TestSeries.find(filter).sort({ startDate: 1 });
    res.json({ success: true, data: data.map(serialize) });
  }));
  router.use(adminAuth);
  router.get('/admin', handle(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const filter = { kind };
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) { const search = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = ['name','nameHi','description','descriptionHi'].map(key => ({ [key]: { $regex: search, $options: 'i' } })); }
    const [items, totalItems] = await Promise.all([TestSeries.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit), TestSeries.countDocuments(filter)]);
    res.json({ success: true, data: items.map(serialize), pagination: { currentPage: page, totalPages: Math.ceil(totalItems/limit), totalItems, itemsPerPage: limit } });
  }));
  router.post('/', handle(async (req, res) => { const item = await TestSeries.create({ ...payload(req.body), kind, createdBy: req.user._id }); notify(item, req.user); res.status(201).json({ success: true, data: serialize(item) }); }));
  router.get('/:id', handle(async (req, res) => { const item = await TestSeries.findOne({ _id: req.params.id, kind }); if (!item) return res.status(404).json({ success: false, message: 'Test series not found.' }); res.json({ success: true, data: serialize(item) }); }));
  router.put('/:id', handle(async (req, res) => { const item = await TestSeries.findOne({ _id: req.params.id, kind }); if (!item) return res.status(404).json({ success: false, message: 'Test series not found.' }); Object.assign(item, payload(req.body)); await item.save(); notify(item, req.user); res.json({ success: true, data: serialize(item) }); }));
  router.patch('/:id/toggle-status', handle(async (req, res) => { const item = await TestSeries.findOne({ _id: req.params.id, kind }); if (!item) return res.status(404).json({ success: false, message: 'Test series not found.' }); item.isActive = !item.isActive; await item.save(); notify(item, req.user); res.json({ success: true, data: serialize(item) }); }));
  router.delete('/:id', handle(async (req, res) => { const item = await TestSeries.findOneAndDelete({ _id: req.params.id, kind }); if (!item) return res.status(404).json({ success: false, message: 'Test series not found.' }); res.json({ success: true }); }));
  return router;
};
