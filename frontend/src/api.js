const API_BASE_URL = "http://localhost:5000/api";

export const apiRequest = async (
  endpoint,
  options = {}
) => {
  const token =
    localStorage.getItem("digitalHeroesToken");

  const isFormData =
    options.body instanceof FormData;

  const headers = {
    ...options.headers,

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };

  // JSON request ke liye Content-Type set karo
  if (!isFormData) {
    if (!headers["Content-Type"]) {
      headers["Content-Type"] =
        "application/json";
    }
  } else {
    // FormData ke case mein browser khud
    // multipart/form-data boundary set karega
    delete headers["Content-Type"];
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Something went wrong"
    );
  }

  return data;
};

export default API_BASE_URL;
