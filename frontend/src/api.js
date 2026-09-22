const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiRequest = async (endpoint, options = {}) => {
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(options.headers || {}),
  };

  // Login / Signup ke time old token send nahi karna
  const isAuthRequest =
    endpoint === "/auth/login" ||
    endpoint === "/auth/signup";

  const token = localStorage.getItem("digitalHeroesToken");

  if (token && !isAuthRequest) {
    headers.Authorization = `Bearer ${token}`;
  }

  // JSON request
  if (!isFormData) {
    headers["Content-Type"] =
      headers["Content-Type"] || "application/json";
  } else {
    // FormData ke liye browser boundary khud set karega
    delete headers["Content-Type"];
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  // Response safely parse karo
  const contentType =
    response.headers.get("content-type");

  let data = {};

  if (
    contentType &&
    contentType.includes("application/json")
  ) {
    data = await response.json();
  } else {
    const text = await response.text();

    data = {
      message: text || "Something went wrong",
    };
  }

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong"
    );
  }

  return data;
};

export default API_BASE_URL;