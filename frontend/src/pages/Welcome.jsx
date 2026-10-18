import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* Left Side: Text and Actions */}
      <div style={{ flex: 1, padding: "4rem 3.5rem", backgroundColor: "#FFFFFF", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 style={{ color: "#2563EB", margin: 0, fontSize: "1.25rem", fontWeight: 700, letterSpacing: "0.02em" }}>
          EV Service Management
        </h2>
        <h1 style={{ color: "#1F2937", fontSize: "2.75rem", lineHeight: 1.25, marginTop: "0.75rem", marginBottom: "1.25rem", fontWeight: 800 }}>
          Keep Your EV Running Smoothly
        </h1>
        <p style={{ color: "#4B5563", fontSize: "1.125rem", lineHeight: 1.6, marginBottom: "2rem", maxWidth: "540px" }}>
          The complete service management platform for electric vehicle owners. 
          Register your vehicles, book maintenance checkups, and track your service records all in one place.
        </p>
        
        <div style={{ display: "flex", gap: "1rem" }}>
          <button 
            onClick={() => navigate("/register")}
            style={{ padding: "0.85rem 2rem", backgroundColor: "#2563EB", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "1rem", fontWeight: 600 }}>
            Create Account
          </button>
          <button 
            onClick={() => navigate("/login")}
            style={{ padding: "0.85rem 2rem", backgroundColor: "#F5F7FA", color: "#1F2937", border: "1px solid #E5E7EB", borderRadius: "8px", cursor: "pointer", fontSize: "1rem", fontWeight: 600 }}>
            Sign In
          </button>
        </div>
      </div>

      {/* Right Side: Visual */}
      <div style={{ flex: 1, backgroundColor: "#F5F7FA", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #E5E7EB" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ width: "150px", height: "150px", backgroundColor: "#2563EB", borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.3)" }}>
             <span style={{ color: "white", fontSize: "4.5rem" }}>⚡</span>
          </div>
          <h3 style={{ color: "#1F2937", marginTop: "1.75rem", fontSize: "1.35rem", fontWeight: 700 }}>Authorized EV Service & Diagnostics</h3>
          <p style={{ color: "#6B7280", marginTop: "0.5rem", fontSize: "0.95rem" }}>Fast, reliable maintenance for your electric vehicle</p>
        </div>
      </div>

    </div>
  );
}