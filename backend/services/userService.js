const supabase = require("../config/supabase");

async function findUserByEmail(email) {
const { data, error } = await supabase
.from("users")
.select("*")
.eq("email", email.toLowerCase())
.maybeSingle();

if (error) throw error;

return data;
}

async function findUserById(id) {
const { data, error } = await supabase
.from("users")
.select("*")
.eq("id", id)
.maybeSingle();

if (error) throw error;

return data;
}

async function createUser(userData) {
const { data, error } = await supabase
.from("users")
.insert([{
name: userData.name,
email: userData.email.toLowerCase(),
password: userData.password,
role: userData.role || "User",
subscription_status: userData.subscriptionStatus || "Not Subscribed",
subscription_plan: userData.subscriptionPlan || null,
charity_contribution: userData.charityContribution || 10,
}])
.select("*")
.single();

if (error) throw error;

return data;
}

async function updateUser(id, updates) {
const { data, error } = await supabase
.from("users")
.update(updates)
.eq("id", id)
.select("*")
.single();

if (error) throw error;

return data;
}

module.exports = {
findUserByEmail,
findUserById,
createUser,
updateUser,
};
