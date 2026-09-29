import axios from "axios";

// =====================================================
// API BASE URL
// =====================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

// =====================================================
// AXIOS INSTANCE
// =====================================================

const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================
// Login.jsx stores:
//
// localStorage.setItem(
//   "digitalHeroesToken",
//   data.token
// );
//
// Therefore always use:
// digitalHeroesToken
// =====================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "digitalHeroesToken"
      );

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    if (error.response) {
      console.error(
        "API Error:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error(
        "API Network Error:",
        error.message
      );
    }

    return Promise.reject(error);
  }
);

// =====================================================
// GENERIC API REQUEST
// =====================================================
//
// SUPPORTED:
//
// 1. apiRequest("/draws")
//    => GET
//
// 2. apiRequest("/draws", {
//      method: "GET"
//    })
//
// 3. apiRequest("/auth/login", {
//      method: "POST",
//      body: JSON.stringify(data)
//    })
//
// 4. apiRequest(
//      "POST",
//      "/auth/login",
//      data
//    )
//
// 5. apiRequest("/some-url", data)
//    => POST
//
// IMPORTANT FIX:
// Previously apiRequest("/draws") became POST
// because arg2 had default {}.
// That caused:
//
// POST /api/draws -> 404
//
// Now a request with only URL becomes GET.
// =====================================================

export const apiRequest = async (
  arg1,
  arg2 = undefined,
  arg3 = undefined
) => {
  try {
    let method;
    let url;
    let data;
    let config = {};

    // =================================================
    // FORMAT 1
    // apiRequest("POST", "/auth/login", data)
    // =================================================

    const validMethods = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ];

    if (
      typeof arg1 === "string" &&
      validMethods.includes(
        arg1.toUpperCase()
      )
    ) {
      method =
        arg1.toUpperCase();

      url = arg2;

      data = arg3;
    }

    // =================================================
    // FORMAT 2
    // apiRequest("/draws")
    // =================================================

    else if (
      arg2 === undefined
    ) {
      url = arg1;

      method = "GET";

      data = undefined;
    }

    // =================================================
    // FORMAT 3
    //
    // apiRequest("/draws", {
    //   method: "GET"
    // })
    //
    // OR
    //
    // apiRequest("/draws", {
    //   method: "POST",
    //   data: {...}
    // })
    //
    // OR
    //
    // apiRequest("/draws", {
    //   method: "POST",
    //   body: JSON.stringify(...)
    // })
    // =================================================

    else if (
      typeof arg1 === "string" &&
      arg2 &&
      typeof arg2 === "object" &&
      (
        arg2.method !== undefined ||
        arg2.data !== undefined ||
        arg2.body !== undefined
      )
    ) {
      url = arg1;

      method = (
        arg2.method ||
        "GET"
      ).toUpperCase();

      // -----------------------------------------------
      // REQUEST DATA
      // -----------------------------------------------

      if (
        arg2.data !== undefined
      ) {
        data = arg2.data;
      }

      else if (
        arg2.body !== undefined
      ) {
        if (
          typeof arg2.body ===
          "string"
        ) {
          try {
            data =
              JSON.parse(
                arg2.body
              );
          } catch (
            parseError
          ) {
            data =
              arg2.body;
          }
        }

        else {
          data =
            arg2.body;
        }
      }

      // -----------------------------------------------
      // OTHER AXIOS CONFIG
      // -----------------------------------------------

      config = {
        ...arg2,
      };

      delete config.method;
      delete config.data;
      delete config.body;
    }

    // =================================================
    // FORMAT 4
    //
    // apiRequest("/some-url", data)
    //
    // Kept for compatibility with existing project code.
    // =================================================

    else {
      url = arg1;

      method = "POST";

      data = arg2;
    }

    // =================================================
    // SAFETY CHECK
    // =================================================

    if (
      typeof url !== "string" ||
      !url.trim()
    ) {
      throw new Error(
        "API URL is required"
      );
    }

    // =================================================
    // AXIOS REQUEST
    // =================================================

    const response =
      await api.request({
        url,
        method,
        data,
        ...config,
      });

    return response.data;
  } catch (error) {
    console.error(
      "apiRequest error:",
      error
    );

    throw error;
  }
};

// =====================================================
// AUTH
// =====================================================

// -----------------------------------------------------
// LOGIN
// -----------------------------------------------------

export const loginUser =
  async (credentials) => {
    const response =
      await api.post(
        "/auth/login",
        {
          email:
            credentials.email,

          password:
            credentials.password,
        }
      );

    return response.data;
  };

// -----------------------------------------------------
// SIGNUP
// -----------------------------------------------------

export const signupUser =
  async (userData) => {
    const response =
      await api.post(
        "/auth/signup",
        userData
      );

    return response.data;
  };

// =====================================================
// USERS
// =====================================================

export const getUsers =
  async () => {
    const response =
      await api.get(
        "/users"
      );

    return response.data;
  };

// =====================================================
// DRAWS
// =====================================================

// -----------------------------------------------------
// GET ALL DRAWS
// GET /api/draws
// -----------------------------------------------------

export const getDraws =
  async () => {
    const response =
      await api.get(
        "/draws"
      );

    return response.data;
  };

// -----------------------------------------------------
// GET LATEST DRAW
// GET /api/draws/latest
// -----------------------------------------------------

export const getLatestDraw =
  async () => {
    const response =
      await api.get(
        "/draws/latest"
      );

    return response.data;
  };

// -----------------------------------------------------
// SIMULATE DRAW
// POST /api/draws/simulate
// -----------------------------------------------------

export const simulateDraw =
  async (drawData) => {
    const response =
      await api.post(
        "/draws/simulate",
        drawData
      );

    return response.data;
  };

// -----------------------------------------------------
// PUBLISH DRAW
// PUT /api/draws/:id/publish
// -----------------------------------------------------

export const publishDraw =
  async (drawId) => {
    const response =
      await api.put(
        `/draws/${drawId}/publish`
      );

    return response.data;
  };

// -----------------------------------------------------
// CALCULATE DRAW
// POST /api/draws/:id/calculate
// -----------------------------------------------------

export const calculateDraw =
  async (drawId) => {
    const response =
      await api.post(
        `/draws/${drawId}/calculate`
      );

    return response.data;
  };

// =====================================================
// CHARITIES
// =====================================================

// -----------------------------------------------------
// GET ALL CHARITIES
// -----------------------------------------------------

export const getCharities =
  async () => {
    const response =
      await api.get(
        "/charities"
      );

    return response.data;
  };

// -----------------------------------------------------
// GET SINGLE CHARITY
// -----------------------------------------------------

export const getCharity =
  async (charityId) => {
    const response =
      await api.get(
        `/charities/${charityId}`
      );

    return response.data;
  };

// =====================================================
// WINNER MANAGEMENT
// =====================================================

// -----------------------------------------------------
// GET ALL WINNERS
// -----------------------------------------------------

export const getWinners =
  async () => {
    const response =
      await api.get(
        "/winners"
      );

    return response.data;
  };

// -----------------------------------------------------
// GET WINNER BY ID
// -----------------------------------------------------

export const getWinnerById =
  async (winnerId) => {
    const response =
      await api.get(
        `/winners/${winnerId}`
      );

    return response.data;
  };

// -----------------------------------------------------
// VERIFY WINNER
// -----------------------------------------------------

export const verifyWinner =
  async (winnerId) => {
    const response =
      await api.put(
        `/winners/${winnerId}/verify`
      );

    return response.data;
  };

// -----------------------------------------------------
// MARK WINNER AS PAID
// -----------------------------------------------------

export const markWinnerPaid =
  async (winnerId) => {
    const response =
      await api.put(
        `/winners/${winnerId}/payment`
      );

    return response.data;
  };

// =====================================================
// ADMIN
// =====================================================

// -----------------------------------------------------
// GET ADMIN REPORTS
// POST /api/admin/reports
// -----------------------------------------------------

export const getAdminReports =
  async () => {
    const response =
      await api.post(
        "/admin/reports"
      );

    return response.data;
  };

// =====================================================
// EXPORT AXIOS INSTANCE
// =====================================================

export default api;