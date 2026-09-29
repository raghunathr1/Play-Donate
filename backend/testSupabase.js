require("dotenv").config({ override: true });

const supabase = require("./config/supabase");

async function testSupabase() {
  try {
    console.log("Testing Supabase connection...");

    const { data, error } = await supabase
      .from("users")
      .select("id, email, role")
      .limit(1);

    if (error) {
      console.error("Supabase Error:");
      console.error(error);
      return;
    }

    console.log("Supabase Connected Successfully!");
    console.log("Users:", data);
  } catch (error) {
    console.error("Connection Error:");
    console.error(error);
  }
}

testSupabase();