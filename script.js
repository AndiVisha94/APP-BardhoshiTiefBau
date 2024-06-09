const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/stunderechnerapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  logs: [
    {
      date: String,
      startTime: String,
      endTime: String,
      breaks: Number,
      hoursWorked: Number,
    },
  ],
});

const User = mongoose.model('User', userSchema);

// Register endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword });
  await newUser.save();
  res.json({ message: 'User registered' });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ userId: user._id }, 'secretkey');
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const verified = jwt.verify(token, 'secretkey');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Endpoint to log work hours
app.post('/log', authenticateToken, async (req, res) => {
  const { date, startTime, endTime, breaks, hoursWorked } = req.body;
  const user = await User.findById(req.user.userId);
  user.logs.push({ date, startTime, endTime, breaks, hoursWorked });
  await user.save();
  res.json({ message: 'Log added' });
});

// Endpoint to get logs
app.get('/logs', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  res.json(user.logs);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
