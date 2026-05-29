const https = require('https');
const SIP = require('../models/SIP');
const { recalculateSipLedger } = require('../cron/jobs');

// Robust native helper to bypass native fetch/undici DNS bugs on local machines
const httpsGet = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status code ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

exports.getSIPs = async (req, res) => {
  try {
    const query = { familyId: req.user.familyId };
    if (req.query.memberId) query.memberId = req.query.memberId;
    if (req.query.status) query.status = req.query.status;

    const sips = await SIP.find(query)
      .populate('memberId', 'name avatar relation')
      .sort('-createdAt');

    // On-Demand refresh check: if server was asleep or we are on localhost,
    // sync active mutual fund NAVs if they haven't been updated today.
    // Executed as a completely non-blocking, asynchronous background task!
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sipsToUpdate = sips.filter(sip => 
      sip.status === 'active' && 
      sip.schemeCode && 
      (!sip.updatedAt || sip.updatedAt < todayStart)
    );

    if (sipsToUpdate.length > 0) {
      // Fire-and-forget background synchronization task
      (async () => {
        for (const sip of sipsToUpdate) {
          try {
            const data = await httpsGet(`https://api.mfapi.in/mf/${sip.schemeCode}`);
            if (data && data.data && data.data.length > 0) {
              const freshSip = await SIP.findById(sip._id);
              if (freshSip) {
                recalculateSipLedger(freshSip, data.data);
                freshSip.updatedAt = new Date(); // Explicitly mark today's sync as done
                await freshSip.save();
              }
            }
          } catch (err) {
            console.error(`Background on-demand SIP refresh failed for ${sip.fundName}:`, err.message);
          }
        }
      })();
    }

    res.json({ success: true, data: sips });
  } catch (error) {
    console.error('Error fetching SIPs:', error);
    res.status(500).json({ message: 'Error fetching SIPs' });
  }
};

// @desc    Get single SIP
// @route   GET /api/sips/:id
exports.getSIP = async (req, res) => {
  try {
    const sip = await SIP.findOne({
      _id: req.params.id,
      familyId: req.user.familyId
    }).populate('memberId', 'name avatar relation');

    if (!sip) return res.status(404).json({ message: 'SIP not found' });
    res.json({ success: true, data: sip });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching SIP' });
  }
};

// @desc    Create SIP
// @route   POST /api/sips
exports.createSIP = async (req, res) => {
  try {
    if (!req.body.memberId) {
      return res.status(400).json({ message: 'Please select a family member first. Go to Family Members to add one.' });
    }

    const sipData = {
      ...req.body,
      familyId: req.user.familyId
    };

    const sip = await SIP.create(sipData);
    const populated = await SIP.findById(sip._id).populate('memberId', 'name avatar relation');

    // Asynchronously backfill historical NAV and units immediately using httpsGet
    if (sip.schemeCode) {
      httpsGet(`https://api.mfapi.in/mf/${sip.schemeCode}`)
        .then(async data => {
          if (data && data.data && data.data.length > 0) {
            const freshSip = await SIP.findById(sip._id);
            if (freshSip) {
              recalculateSipLedger(freshSip, data.data);
              await freshSip.save();
            }
          }
        })
        .catch(err => console.error(`Error initialising new SIP NAV/ledger:`, err));
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create SIP error:', error);
    res.status(500).json({ message: error.message || 'Error creating SIP' });
  }
};

// @desc    Update SIP
// @route   PUT /api/sips/:id
exports.updateSIP = async (req, res) => {
  try {
    const sip = await SIP.findOneAndUpdate(
      { _id: req.params.id, familyId: req.user.familyId },
      req.body,
      { new: true, runValidators: true }
    ).populate('memberId', 'name avatar relation');

    if (!sip) return res.status(404).json({ message: 'SIP not found' });

    // Asynchronously update units & calculations immediately using httpsGet
    if (sip.schemeCode) {
      httpsGet(`https://api.mfapi.in/mf/${sip.schemeCode}`)
        .then(async data => {
          if (data && data.data && data.data.length > 0) {
            const freshSip = await SIP.findById(sip._id);
            if (freshSip) {
              recalculateSipLedger(freshSip, data.data);
              await freshSip.save();
            }
          }
        })
        .catch(err => console.error(`Error updating SIP NAV/ledger:`, err));
    }

    res.json({ success: true, data: sip });
  } catch (error) {
    res.status(500).json({ message: 'Error updating SIP' });
  }
};

// @desc    Delete SIP
// @route   DELETE /api/sips/:id
exports.deleteSIP = async (req, res) => {
  try {
    const sip = await SIP.findOneAndDelete({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!sip) return res.status(404).json({ message: 'SIP not found' });
    res.json({ success: true, message: 'SIP deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting SIP' });
  }
};

// @desc    Add payment to SIP
// @route   POST /api/sips/:id/payments
exports.addPayment = async (req, res) => {
  try {
    const sip = await SIP.findOne({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!sip) return res.status(404).json({ message: 'SIP not found' });

    sip.payments.push(req.body);
    await sip.save();

    // Asynchronously update units & calculations immediately
    if (sip.schemeCode) {
      fetch(`https://api.mfapi.in/mf/${sip.schemeCode}`)
        .then(res => res.json())
        .then(async data => {
          if (data && data.data && data.data.length > 0) {
            const freshSip = await SIP.findById(sip._id);
            if (freshSip) {
              recalculateSipLedger(freshSip, data.data);
              await freshSip.save();
            }
          }
        })
        .catch(err => console.error(`Error updating SIP NAV/ledger:`, err));
    }

    const populated = await SIP.findById(sip._id).populate('memberId', 'name avatar relation');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error adding payment' });
  }
};

// @desc    Update payment status
// @route   PUT /api/sips/:id/payments/:paymentId
exports.updatePayment = async (req, res) => {
  try {
    const sip = await SIP.findOne({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!sip) return res.status(404).json({ message: 'SIP not found' });

    const payment = sip.payments.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    Object.assign(payment, req.body);
    await sip.save();

    // Asynchronously update units & calculations immediately
    if (sip.schemeCode) {
      fetch(`https://api.mfapi.in/mf/${sip.schemeCode}`)
        .then(res => res.json())
        .then(async data => {
          if (data && data.data && data.data.length > 0) {
            const freshSip = await SIP.findById(sip._id);
            if (freshSip) {
              recalculateSipLedger(freshSip, data.data);
              await freshSip.save();
            }
          }
        })
        .catch(err => console.error(`Error updating SIP NAV/ledger:`, err));
    }

    res.json({ success: true, data: sip });
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment' });
  }
};
