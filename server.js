
// server.js
const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app       = express();
const JSON_PATH = path.join(__dirname, 'events.json');
const CRASH_LOG = path.join(__dirname, 'item-log.json');
const INVENTORY_PATH = path.join(__dirname, 'inventory.json');
const REPORT_PATH = path.join(__dirname, 'report-visible-events.json');
const PORT      = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));


// Ensure existing events have IDs
(() => {
  try {
    const raw    = fs.readFileSync(JSON_PATH, 'utf8');
    let   events = JSON.parse(raw), dirty = false;
    events = events.map(ev => {
      if (!ev.id) { ev.id = Date.now().toString() + Math.floor(Math.random()*10000); dirty = true; }
      return ev;
    });
    if (dirty) fs.writeFileSync(JSON_PATH, JSON.stringify(events,null,2),'utf8');
  } catch(err) { console.error('ID init error:', err); }
})();

// Crash logging endpoint
app.post('/api/crash', (req,res) => {
  try {
    let logs = fs.existsSync(CRASH_LOG)
        ? JSON.parse(fs.readFileSync(CRASH_LOG,'utf8'))
        : [];
    logs.push({ ...req.body, id: Date.now().toString() });
    fs.writeFileSync(CRASH_LOG, JSON.stringify(logs,null,2),'utf8');
  } catch(e) { console.error('Crash log error:', e); }
  res.sendStatus(204);
});

// Read all events
app.get('/api/events', (_req,res) => {
  try {
    const ev = JSON.parse(fs.readFileSync(JSON_PATH,'utf8'));
    res.json(ev);
  } catch(err) {
    console.error('GET /api/events error:', err);
    res.status(500).json({ error:'Failed to read events' });
  }
});

// Create a new event or draft (no conflict check for drafts)
app.post('/api/events', (req,res) => {
  try {
    const events = JSON.parse(fs.readFileSync(JSON_PATH,'utf8'));
    const { start, duration, status, organiser, participants } = req.body;
    if (status === 'Scheduled') {
      const newStart = new Date(start);
      const newEnd   = new Date(newStart.getTime() + duration*60000);
      const conflict = events
          .filter(e => e.status==='Scheduled')
          .some(ev => {
            const s = new Date(ev.start);
            const e = new Date(s.getTime() + ev.duration*60000);
            if (newStart >= e || newEnd <= s) return false;
            if (ev.organiser === organiser) return true;
            return !!(Array.isArray(ev.participants) && participants.some(p => ev.participants.includes(p)));

          });
      if (conflict) {
        return res.status(409).json({ error:'Conflict: The organizer or participant has already made a schedule at the same time' });
      }
    }
    const newEvent = { ...req.body, id: Date.now().toString()+Math.floor(Math.random()*10000) };
    events.push(newEvent);
    fs.writeFileSync(JSON_PATH, JSON.stringify(events,null,2),'utf8');
    res.json({ success:true, id:newEvent.id });
  } catch(err) {
    console.error('POST /api/events error:', err);
    res.status(500).json({ error:'Failed to create event' });
  }
});

// Update existing event or draft
app.put('/api/events/:id', (req,res) => {
  try {
    const events = JSON.parse(fs.readFileSync(JSON_PATH,'utf8'));
    const idx = events.findIndex(e => e.id === req.params.id);
    if (idx<0) return res.status(404).json({ error:'Event not found' });

    const { start, duration, status, organiser, participants } = req.body;
    if (status==='Scheduled') {
      const newStart = new Date(start);
      const newEnd   = new Date(newStart.getTime()+duration*60000);
      const conflict = events
          .filter(e=>e.status==='Scheduled' && e.id!==req.params.id)
          .some(ev => {
            const s = new Date(ev.start);
            const e = new Date(s.getTime()+ev.duration*60000);
            if (newStart>=e || newEnd<=s) return false;
            if (ev.organiser === organiser) return true;
            return !!(Array.isArray(ev.participants) && participants.some(p => ev.participants.includes(p)));

          });
      if (conflict) {
        return res.status(409).json({ error:'Conflict: The organizer or participant has already made a schedule at the same time' });
      }
    }

    events[idx] = { ...events[idx], ...req.body };
    fs.writeFileSync(JSON_PATH, JSON.stringify(events,null,2),'utf8');
    res.json({ success:true });
  } catch(err) {
    console.error('PUT /api/events/:id error:', err);
    res.status(500).json({ error:'Failed to update event' });
  }
});

// Delete event or draft
app.delete('/api/events/:id', (req,res) => {
  try {
    const events = JSON.parse(fs.readFileSync(JSON_PATH,'utf8'));
    const filtered = events.filter(e => e.id !== req.params.id);
    if (filtered.length === events.length) {
      return res.status(404).json({ error:'Event not found' });
    }
    fs.writeFileSync(JSON_PATH, JSON.stringify(filtered,null,2),'utf8');
    res.json({ success:true });
  } catch(err) {
    console.error('DELETE /api/events/:id error:', err);
    res.status(500).json({ error:'Failed to delete event' });
  }
});

// Uncaught exception logging
process.on('uncaughtException', err => {
  try {
    let logs = fs.existsSync(CRASH_LOG)
        ? JSON.parse(fs.readFileSync(CRASH_LOG,'utf8'))
        : [];
    logs.push({ origin:'uncaughtException', message:err.message, stack:err.stack, time:new Date().toISOString() });
    fs.writeFileSync(CRASH_LOG, JSON.stringify(logs,null,2),'utf8');
  } catch(e) {
    console.error('Crash log write error:', e);
  }
  console.error('Unhandled Exception:', err);
  process.exit(1);
});

//end of senior wizard part

// Inventory Management Routes
app.post('/im/manage', (req, res) => {
  try {
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
    const itemId = req.body.id;

    if (itemId) {
      const existingItemIndex = inventory.findIndex(item => item.id === itemId);
      if (existingItemIndex === -1) {
        return res.status(404).send('Item not found');
      }

      const existingItem = inventory[existingItemIndex];
      const newQuantity = parseInt(req.body.quantity);

      inventory[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2), 'utf8');

      // Check if stock alert needed
      if (newQuantity <= 5) {
        const alertLog = {
          origin: 'inventory-alert',
          message: `⚠️ Low stock alert: ${existingItem.name} (Current: ${newQuantity}, Minimum: 5)`,
          time: new Date().toISOString()
        };

        let logs = [];
        if (fs.existsSync(CRASH_LOG)) {
          logs = JSON.parse(fs.readFileSync(CRASH_LOG, 'utf8'));
        }
        logs.push(alertLog);

        logs = maintainAlertLog(logs);
        fs.writeFileSync(CRASH_LOG, JSON.stringify(logs, null, 2), 'utf8');
      }

      // Log the action
      const logEntry = {
        origin: 'inventory-manage',
        message: `Item quantity updated successfully: ${existingItem.name} (${existingItem.quantity} → ${newQuantity})`,
        time: new Date().toISOString()
      };

      let logs = [];
      if (fs.existsSync(CRASH_LOG)) {
        logs = JSON.parse(fs.readFileSync(CRASH_LOG, 'utf8'));
      }
      logs.push(logEntry);
      fs.writeFileSync(CRASH_LOG, JSON.stringify(logs, null, 2), 'utf8');

      return res.redirect('/inventory-dashboard.html');
    }

    const newItem = {
      id: Date.now().toString() + Math.floor(Math.random()*10000),
      name: req.body.itemName,
      quantity: parseInt(req.body.quantity),
      category: req.body.category,
      condition: req.body.condition,
      minStockLevel: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inventory.push(newItem);
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2), 'utf8');

    // Check if stock alert needed
    if (newItem.quantity <= 5) {
      const alertLog = {
        origin: 'inventory-alert',
        message: `⚠️ Low stock alert: ${newItem.name} (Current: ${newItem.quantity}, Minimum: 5)`,
        time: new Date().toISOString()
      };

      let logs = [];
      if (fs.existsSync(CRASH_LOG)) {
        logs = JSON.parse(fs.readFileSync(CRASH_LOG, 'utf8'));
      }
      logs.push(alertLog);
      logs = maintainAlertLog(logs);
      fs.writeFileSync(CRASH_LOG, JSON.stringify(logs, null, 2), 'utf8');
    }

    // Log the action
    const logEntry = {
      origin: 'inventory-manage',
      message: `Item created successfully: ${newItem.name}`,
      time: new Date().toISOString()
    };

    let logs = [];
    if (fs.existsSync(CRASH_LOG)) {
      logs = JSON.parse(fs.readFileSync(CRASH_LOG, 'utf8'));
    }
    logs.push(logEntry);
    fs.writeFileSync(CRASH_LOG, JSON.stringify(logs, null, 2), 'utf8');

    res.redirect('/inventory-dashboard.html');
  } catch (err) {
    console.error('POST /im/manage error:', err);
    res.status(500).send('Failed to process inventory item');
  }
});

app.get('/im/items', (req, res) => {
  try {
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
    res.json(inventory);
  } catch (err) {
    console.error('GET /im/items error:', err);
    res.status(500).json({ error: 'Failed to read inventory' });
  }
});

app.post('/im/delete/:id', (req, res) => {
  try {
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
    const itemId = req.params.id;

    const itemToDelete = inventory.find(item => item.id === itemId);
    if (!itemToDelete) {
      return res.status(404).send('Item not found');
    }

    const updatedInventory = inventory.filter(item => item.id !== itemId);
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(updatedInventory, null, 2), 'utf8');

    // Log the deletion
    const logEntry = {
      origin: 'inventory-manage',
      message: `Item deleted: ${itemToDelete.name} (Quantity: ${itemToDelete.quantity}, Category: ${itemToDelete.category})`,
      time: new Date().toISOString()
    };

    let logs = [];
    if (fs.existsSync(CRASH_LOG)) {
      logs = JSON.parse(fs.readFileSync(CRASH_LOG, 'utf8'));
    }
    logs.push(logEntry);
    fs.writeFileSync(CRASH_LOG, JSON.stringify(logs, null, 2), 'utf8');

    res.redirect('/inventory-dashboard.html');
  } catch (err) {
    console.error('DELETE /im/delete/:id error:', err);
    res.status(500).send('Failed to delete inventory item');
  }
});

// Get inventory logs
app.get('/api/inventory-log', (req, res) => {
  try {
    let logs = [];
    if (fs.existsSync(CRASH_LOG)) {
      logs = JSON.parse(fs.readFileSync(CRASH_LOG, 'utf8'));
    }
    // Filter only inventory-related logs
    logs = logs.filter(log => log.origin === 'inventory-manage');
    res.json(logs);
  } catch (err) {
    console.error('GET /api/inventory-log error:', err);
    res.status(500).json({ error: 'Failed to read inventory logs' });
  }
});

// Add a new endpoint for alerts
app.get('/api/inventory-alerts', (req, res) => {
  try {
    let logs = [];
    if (fs.existsSync(CRASH_LOG)) {
      logs = JSON.parse(fs.readFileSync(CRASH_LOG, 'utf8'));
    }
    // Filter only alert logs
    logs = logs.filter(log => log.origin === 'inventory-alert');
    res.json(logs);
  } catch (err) {
    console.error('GET /api/inventory-alerts error:', err);
    res.status(500).json({ error: 'Failed to read inventory alerts' });
  }
});

app.get('/api/users', (_req, res) => {
  const users = JSON.parse(fs.readFileSync(path.join(__dirname,'users.json'),'utf8'));
  res.json(users);
});

// Get inventory alerts - only return latest 3
app.get('/im/alerts', (req, res) => {
  try {
    let logs = [];
    if (fs.existsSync(CRASH_LOG)) {
      logs = JSON.parse(fs.readFileSync(CRASH_LOG, 'utf8'));
    }
    // Filter only alert logs and get latest 3
    logs = logs
        .filter(log => log.origin === 'inventory-alert')
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 3);
    res.json(logs);
  } catch (err) {
    console.error('GET /im/alerts error:', err);
    res.status(500).json({ error: 'Failed to read inventory alerts' });
  }
});

app.get('/api/report-visible-events', (_req, res) => {
  try {
    const raw = fs.readFileSync(REPORT_PATH, 'utf8');
    const visible = JSON.parse(raw);
    res.json(visible);
  } catch (err) {
    console.error('GET /api/report-visible-events error:', err);
    res.status(500).json({ error: 'Failed to read visible events' });
  }
});


// Function to maintain only the latest 3 alerts in the log file
function maintainAlertLog(logs) {
  const alerts = logs.filter(log => log.origin === 'inventory-alert');
  const nonAlerts = logs.filter(log => log.origin !== 'inventory-alert');

  // Sort alerts by time and keep only the latest 3
  const latestAlerts = alerts
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 3);

  // Combine non-alerts with the latest 3 alerts
  return [...nonAlerts, ...latestAlerts];
}

process.on('uncaughtException', err => {
  try {
    let logs = [];
    if (fs.existsSync(CRASH_LOG)) {
      logs = JSON.parse(fs.readFileSync(CRASH_LOG, 'utf8'));
    }
    logs.push({
      origin:  'server-uncaughtException',
      message: err.message,
      stack:   err.stack,
      time:    new Date().toISOString()
    });
    fs.writeFileSync(CRASH_LOG, JSON.stringify(logs, null, 2), 'utf8');
  } catch (writeErr) {
    console.error('Failed to write crash log:', writeErr);
  }
  console.error('Unhandled Exception:', err);
  process.exit(1);
});

app.post('/login', (req, res) => {
  const { username, password, role } = req.body;
  const USERS_PATH = path.join(__dirname, 'users.json');

  try {
    const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
    const user = users.find(u => u.username === username && u.password === password && u.role === role);

    if (!user) {
      return res.send('❌ Invalid credentials. <a href="/index.html">Try again</a>');
    }

    switch (role) {
      case 'Senior Wizard':
        return res.redirect('/senior-dashboard.html');
      case 'Junior Wizard':
        return res.redirect('/event-dashboard.html');
      case 'Inventory Manager':
        return res.redirect('/inventory-dashboard.html');
      case 'Magical Analyst':
        return res.redirect('/analyst-dashboard.html');
      default:
        return res.send('❌ Unknown role.');
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).send('Server error during login.');
  }
});

app.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  const USERS_PATH = path.join(__dirname, 'users.json');

  try {
    let users = fs.existsSync(USERS_PATH)
        ? JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'))
        : [];

    if (users.find(u => u.username === username)) {
      return res.send('❌ Username already exists. <a href="/register.html">Try again</a>');
    }

    users.push({ username, password, role });
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');

    return res.redirect('/index.html');
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).send('Server error during registration.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/index.html`);
});