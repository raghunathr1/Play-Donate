const dotenv = require("dotenv");
dotenv.config({ override: true });

const supabase = require("./config/supabase");

async function testSupabase() {
const { data, error } = await supabase
.from("users")
.select("id")
.limit(1);

if (error) {
console.error("❌ Supabase Connection Failed:");
console.error(error);
return;
}

console.log("✅ Supabase Connected Successfully!");
console.log("Users table accessible:", data);
}

testSupabase();