const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
};


export const getVisits = async ({
  token,
  status = "",
  locationId = "",
  page = 1,
  limit = 5,
}) => {
  const params = new URLSearchParams();

  params.set("page", page);
  params.set("limit", limit);

  if (status) {
    params.set("status", status);
  }

  if (locationId) {
    params.set("location_id", locationId);
  }

  const response = await fetch(
    `${API_BASE_URL}/visits?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch visits");
  }

  return data;
};

export const getLocations = async (token) => {
  const response = await fetch(`${API_BASE_URL}/locations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch locations");
  }

  return data;
};


export const createVisit = async (token, visitData) => {
  const response = await fetch(`${API_BASE_URL}/visits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(visitData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create visit");
  }

  return data;
};


export const getVisitById = async (token, visitId) => {
  const response = await fetch(`${API_BASE_URL}/visits/${visitId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch visit");
  }

  return data;
};


export const decideVisit = async (token, visitId, decision, remark) => {
  const response = await fetch(
    `${API_BASE_URL}/visits/${visitId}/decision`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        decision,
        remark,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to process decision");
  }

  return data;
};



export const updateVisit = async (token, visitId, visitData) => {
  const response = await fetch(`${API_BASE_URL}/visits/${visitId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(visitData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update visit");
  }

  return data;
};

export const submitVisit = async (token, visitId) => {
  const response = await fetch(
    `${API_BASE_URL}/visits/${visitId}/submit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to submit visit");
  }

  return data;
};

export const completeVisit = async (token, visitId) => {
  const response = await fetch(
    `${API_BASE_URL}/visits/${visitId}/complete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to complete visit");
  }

  return data;
};

export const getSummary = async (token) => {
  const response = await fetch(`${API_BASE_URL}/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch summary");
  }

  return data;
};

