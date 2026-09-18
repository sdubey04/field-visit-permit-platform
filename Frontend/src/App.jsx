import { useEffect, useState } from "react";
import {
  createVisit,
  getLocations,
  getVisits,
  loginUser,
} from "./api";

function App() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [visits, setVisits] = useState([]);
  const [locations, setLocations] = useState([]);

  const [status, setStatus] = useState("");
  const [locationId, setLocationId] = useState("");
  const [page, setPage] = useState(1);

  const [visitLoading, setVisitLoading] = useState(false);
  const [visitError, setVisitError] = useState("");

  const token = localStorage.getItem("token");


const [visitForm, setVisitForm] = useState({
  title: "",
  purpose: "",
  location_id: "",
  planned_date: "",
  estimated_cost: "",
});

const [createError, setCreateError] = useState("");
const [createSuccess, setCreateSuccess] = useState("");
const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      return;
    }

    const loadLocations = async () => {
      try {
        const data = await getLocations(token);
        setLocations(data);
      } catch (error) {
        console.error(error);
      }
    };

    loadLocations();
  }, [user, token]);

  useEffect(() => {
    if (!user || !token) {
      return;
    }

    const loadVisits = async () => {
      setVisitLoading(true);
      setVisitError("");

      try {
        const data = await getVisits({
          token,
          status,
          locationId,
          page,
          limit: 5,
        });

        setVisits(data.data);
      } catch (error) {
        setVisitError(error.message);
      } finally {
        setVisitLoading(false);
      }
    };

    loadVisits();
  }, [user, token, status, locationId, page]);

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoginError("");
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setVisits([]);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handleLocationChange = (event) => {
    setLocationId(event.target.value);
    setPage(1);
  };


  const handleVisitFormChange = (event) => {
  const { name, value } = event.target;

  setVisitForm((current) => ({
    ...current,
    [name]: value,
  }));
};

const handleCreateVisit = async (event) => {
  event.preventDefault();

  setCreateError("");
  setCreateSuccess("");
  setCreating(true);

  try {
    await createVisit(token, {
      title: visitForm.title,
      purpose: visitForm.purpose,
      location_id: Number(visitForm.location_id),
      planned_date: visitForm.planned_date,
      estimated_cost: Number(visitForm.estimated_cost),
    });

    setVisitForm({
      title: "",
      purpose: "",
      location_id: "",
      planned_date: "",
      estimated_cost: "",
    });

    setCreateSuccess("Visit created successfully as DRAFT.");

    setPage(1);

    const data = await getVisits({
      token,
      status,
      locationId,
      page: 1,
      limit: 5,
    });

    setVisits(data.data);
  } catch (error) {
    setCreateError(error.message);
  } finally {
    setCreating(false);
  }
};



  if (!user) {
    return (
      <div>
        <h1>Field Visit Permit Platform</h1>

        <h2>Login</h2>

        <form onSubmit={handleLogin}>
          <div>
            <label>Email</label>
            <br />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <br />

          <div>
            <label>Password</label>
            <br />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <br />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {loginError && <p>{loginError}</p>}
      </div>
    );
  }

  return (
    <div>
      <h1>Field Visit Permit Platform</h1>

      <p>
        Logged in as: <strong>{user.name}</strong> ({user.role})
      </p>

      <button onClick={handleLogout}>Logout</button>

      <hr />


{user.role === "FIELD_OFFICER" && (
  <>
    <h2>Create Visit</h2>

    <form onSubmit={handleCreateVisit}>
      <div>
        <label>Title</label>
        <br />
        <input
          name="title"
          value={visitForm.title}
          onChange={handleVisitFormChange}
          required
        />
      </div>

      <br />

      <div>
        <label>Purpose</label>
        <br />
        <textarea
          name="purpose"
          value={visitForm.purpose}
          onChange={handleVisitFormChange}
          required
        />
      </div>

      <br />

      <div>
        <label>Location</label>
        <br />

        <select
          name="location_id"
          value={visitForm.location_id}
          onChange={handleVisitFormChange}
          required
        >
          <option value="">Select location</option>

          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <br />

      <div>
        <label>Planned Date</label>
        <br />

        <input
          type="date"
          name="planned_date"
          value={visitForm.planned_date}
          onChange={handleVisitFormChange}
          required
        />
      </div>

      <br />

      <div>
        <label>Estimated Cost</label>
        <br />

        <input
          type="number"
          min="0"
          step="0.01"
          name="estimated_cost"
          value={visitForm.estimated_cost}
          onChange={handleVisitFormChange}
          required
        />
      </div>

      <br />

      <button type="submit" disabled={creating}>
        {creating ? "Creating..." : "Create Visit"}
      </button>
    </form>

    {createError && <p>{createError}</p>}
    {createSuccess && <p>{createSuccess}</p>}

    <hr />
  </>
)}


      <h2>Visits</h2>

      <div>
        <label>Status: </label>

        <select value={status} onChange={handleStatusChange}>
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <label> Location: </label>

        <select
          value={locationId}
          onChange={handleLocationChange}
        >
          <option value="">All</option>

          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <br />

      {visitLoading && <p>Loading visits...</p>}

      {visitError && <p>{visitError}</p>}

      {!visitLoading && !visitError && visits.length === 0 && (
        <p>No visits found.</p>
      )}

      {!visitLoading && visits.length > 0 && (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Title</th>
              <th>Location</th>
              <th>Planned Date</th>
              <th>Estimated Cost</th>
              <th>Status</th>
              <th>Created By</th>
            </tr>
          </thead>

          <tbody>
            {visits.map((visit) => (
              <tr key={visit.id}>
                <td>{visit.title}</td>
                <td>{visit.location_name}</td>
                <td>{visit.planned_date}</td>
                <td>{visit.estimated_cost}</td>
                <td>{visit.status}</td>
                <td>{visit.created_by_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <br />

      <button
        disabled={page === 1}
        onClick={() => setPage((current) => current - 1)}
      >
        Previous
      </button>

      <span> Page {page} </span>

      <button
        disabled={visits.length < 5}
        onClick={() => setPage((current) => current + 1)}
      >
        Next
      </button>
    </div>
  );
}

export default App;