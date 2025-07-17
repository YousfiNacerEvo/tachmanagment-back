const { supabase } = require('../services/supabaseClient');

// POST /api/users
async function createUser(req, res) {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      console.log('[AddUser] Missing fields', req.body);
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    // Create user in Supabase Auth (admin)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
    });
    if (error || !data || !data.user) {
      console.log('[AddUser] Supabase error:', error);
      const msg = error?.message || 'Error creating user in Supabase.';
      return res.status(400).json({ message: msg });
    }
    const userId = data.user.id;
    // Update the role in public.users (created automatically by the trigger)
    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId);
    if (updateError) {
      console.log('[AddUser] Error updating users table:', updateError);
      return res.status(400).json({ message: updateError.message });
    }
    console.log('[AddUser] User created and role updated successfully:', userId);
    return res.status(201).json({ message: 'User created successfully.', id: userId });
  } catch (err) {
    console.log('[AddUser] Exception:', err);
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
}

module.exports = { createUser }; 