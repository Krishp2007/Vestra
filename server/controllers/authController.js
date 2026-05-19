const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SIP = require('../models/SIP');
const FD = require('../models/FD');
const Stock = require('../models/Stock');
const FamilyMember = require('../models/FamilyMember');
const Alert = require('../models/Alert');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const ejs = require('ejs');
const path = require('path');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Validate strong password
const isStrongPassword = (password) => {
  // Min 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return passwordRegex.test(password);
};

// @desc    Register new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, relation } = req.body;

    // Validate password strength
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters, contain at least one uppercase letter, one lowercase letter, one number, and one special character' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate a unique family ID for this user
    const familyId = uuidv4();
    
    // Auto-generate username if not provided
    const baseUsername = req.body.username || name.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 10000);
    const username = baseUsername + '_' + crypto.randomBytes(2).toString('hex');

    const user = await User.create({
      name,
      email,
      password,
      username,
      relation: relation || 'Self',
      familyId,
      role: 'admin'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        relation: user.relation,
        avatar: user.avatar,
        familyId: user.familyId,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        relation: user.relation,
        avatar: user.avatar,
        familyId: user.familyId,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Google OAuth login/register
// @route   POST /api/auth/google
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential required' });

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, picture, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      const baseUsername = name.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 10000);
      const username = baseUsername + '_' + crypto.randomBytes(2).toString('hex');

      // Auto-register new Google user
      user = await User.create({
        name,
        email,
        username,
        password: uuidv4(), // random password (won't be used)
        avatar: picture || '👤',
        relation: 'Self',
        familyId: uuidv4(),
        role: 'admin',
        googleId,
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        relation: user.relation,
        avatar: user.avatar || picture,
        familyId: user.familyId,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        relation: user.relation,
        avatar: user.avatar,
        familyId: user.familyId,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.avatar) user.avatar = req.body.avatar;
    if (req.body.username) {
      const existing = await User.findOne({ username: req.body.username, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ message: 'Username already taken' });
      user.username = req.body.username;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        relation: updatedUser.relation,
        avatar: updatedUser.avatar,
        familyId: updatedUser.familyId,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters, contain at least one uppercase letter, one lowercase letter, one number, and one special character' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password cannot be the same as current password' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
};

// @desc    Delete account permanently
// @route   DELETE /api/auth/delete-account
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Please provide your password to confirm deletion' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Password is incorrect' });

    const familyId = user.familyId;

    // Delete ALL data associated with this family
    await Promise.all([
      SIP.deleteMany({ familyId }),
      FD.deleteMany({ familyId }),
      Stock.deleteMany({ familyId }),
      FamilyMember.deleteMany({ familyId }),
      Alert.deleteMany({ familyId }),
      User.findByIdAndDelete(user._id)
    ]);

    res.json({ success: true, message: 'Account and all data permanently deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error deleting account' });
  }
};

// @desc    Forgot password (generates code and sends email)
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'There is no user with that email' });

    // Generate 6 digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash code and set to resetPasswordToken
    user.resetPasswordToken = crypto.createHash('sha256').update(resetCode).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

    await user.save();

    const templatePath = path.join(__dirname, '../templates/emails/passwordReset.ejs');
    const html = await ejs.renderFile(templatePath, {
      userName: user.name,
      resetCode: resetCode
    });

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Code - Assets View',
        html
      });
      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      console.error('Email send error:', err);
      return res.status(500).json({ message: 'Email could not be sent. Please check SMTP configuration.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reset password using code
// @route   PUT /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Please provide email, code, and new password' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters, contain at least one uppercase letter, one lowercase letter, one number, and one special character' });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(code).digest('hex');

    const user = await User.findOne({
      email,
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
