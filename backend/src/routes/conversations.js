const { Router } = require('express')
const ctrl = require('../controllers/conversations')
const r = Router()

r.get('/', ctrl.list)
r.post('/', ctrl.create)
r.get('/unread/count', ctrl.unreadCount)
r.get('/unread/map', ctrl.unreadMap)
r.get('/:id/messages', ctrl.messages)
r.post('/:id/messages', ctrl.send)
r.patch('/messages/:id/read', ctrl.read)

module.exports = r
