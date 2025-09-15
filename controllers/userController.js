const { supabase } = require('../services/supabaseClient');
const { sendEmail } = require('../services/emailService');
const { welcomeTemplate } = require('../services/emailTemplates');

// POST /api/users
async function createUser(req, res) {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      console.log('[AddUser] Missing fields', req.body);
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    
    // Validate role
    const validRoles = ['admin', 'member', 'guest'];
    if (!validRoles.includes(role)) {
      console.log('[AddUser] Invalid role:', role);
      return res.status(400).json({ message: 'Invalid role. Must be one of: admin, member, guest.' });
    }
    
    // Create user in Supabase Auth (admin)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // disables email confirmation
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
    
    // Send welcome email
    try {
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/login';
      const { subject, html } = welcomeTemplate({ 
        userEmail: email, 
        userRole: role, 
        loginUrl 
      });
      
      await sendEmail({
        to: email,
        subject,
        html,
        text: `Welcome to TachManager! Your account has been created with role: ${role}. You can now log in at ${loginUrl}`
      });
      
      console.log('[AddUser] Welcome email sent successfully to:', email);
    } catch (emailError) {
      // Don't fail user creation if email fails
      console.warn('[AddUser] Failed to send welcome email:', emailError.message);
    }
    
    return res.status(201).json({ message: 'User created successfully.', id: userId });
  } catch (err) {
    console.log('[AddUser] Exception:', err);
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
}

// GET /api/users/:id
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'User id is required.' });
    }
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      return res.status(404).json({ message: error?.message || 'User not found.' });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
}

// GET /api/users/all
async function getAllUsers(req, res) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role');
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
}

// DELETE /api/users/:id
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'User id is required.' });
    }
    // Supprimer dans Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      return res.status(400).json({ message: authError.message || 'Failed to delete user from auth.' });
    }
    // Supprimer dans la table users
    const { error: dbError } = await supabase.from('users').delete().eq('id', id);
    if (dbError) {
      return res.status(400).json({ message: dbError.message || 'Failed to delete user from database.' });
    }
    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
}

// PATCH /api/users/:id
async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!id) {
      return res.status(400).json({ message: 'User id is required.' });
    }
    const validRoles = ['admin', 'member', 'guest'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be one of: admin, member, guest.' });
    }
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id, email, role')
      .single();
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
}

// GET /api/users/me - Get current user profile
async function getMyProfile(req, res) {
  try {
    console.log('🔍 getMyProfile called');
    const userId = req.user.id;
    console.log('userId:', userId);
    if (!userId) {
      console.log('❌ No userId found');
      return res.status(400).json({ message: 'User not authenticated.' });
    }
    console.log('✅ UserId found, making database query...');
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single();
    
    console.log('Database result:', { data, error });
      
    if (error || !data) {
      console.log('❌ Database error or no data:', error);
      return res.status(404).json({ message: error?.message || 'User profile not found.' });
    }
    
    console.log('✅ Success, returning user data');
    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ Exception in getMyProfile:', err);
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
}

module.exports = { 
  createUser, 
  getUserById, 
  getAllUsers, 
  deleteUser, 
  updateUserRole,
  getMyProfile
};