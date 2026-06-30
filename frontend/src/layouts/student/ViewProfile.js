import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import {
  StudentHero,
  StudentStatCard,
  StudentTopbar,
} from "./StudentDashboardChrome";

import "./student-dashboard.css";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
};

const displayValue = (value) => (value === undefined || value === null || value === "" ? "Not added" : value);

function ViewProfile() {
  const navigate = useNavigate();
  const storedUser = useMemo(readUser, []);
  const userId = storedUser.id || storedUser.user_id;
  const [profileData, setProfileData] = useState({});
  const [editedData, setEditedData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) return;

    fetch(`/api/student/profile/${userId}`)
      .then((response) => response.json())
      .then((data) => {
        const next = {
          user_id: data.user_id || userId,
          name: data.name || storedUser.name || "Student",
          email: data.email || storedUser.email || "",
          role: data.role || storedUser.role || "student",
          class: data.class || data.class_name || "",
          schoolname: data.schoolname || data.school_name || "",
          phone: data.phone || "",
          dateOfBirth: data.dateOfBirth || data.date_of_birth || "",
          address: data.address || "",
          guardianName: data.guardianName || data.guardian_name || "",
          guardianPhone: data.guardianPhone || data.guardian_phone || "",
          is_active: data.is_active,
          created_at: data.created_at,
        };
        setProfileData(next);
        setEditedData(next);
      })
      .catch(() => {
        const fallback = {
          user_id: userId,
          name: storedUser.name || "Student",
          email: storedUser.email || "",
          role: storedUser.role || "student",
        };
        setProfileData(fallback);
        setEditedData(fallback);
        setMessage("Profile details could not be loaded from the server.");
      });
  }, [storedUser.email, storedUser.name, storedUser.role, userId]);

  const updateEditedData = (field, value) => {
    setEditedData((current) => ({ ...current, [field]: value }));
  };

  const handleEdit = () => {
    setEditedData(profileData);
    setIsEditing(true);
    setMessage("");
  };

  const handleCancel = () => {
    setEditedData(profileData);
    setIsEditing(false);
    setMessage("");
  };

  const handleSave = async () => {
    if (!profileData.user_id) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/student/profile/${profileData.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedData),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || data.message || "Profile update failed.");
        return;
      }
      const next = { ...editedData, ...data };
      setProfileData(next);
      setEditedData(next);
      setIsEditing(false);
      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage("Unable to save profile right now.");
    } finally {
      setSaving(false);
    }
  };

  const fieldGroups = [
    {
      title: "Personal information",
      fields: [
        { icon: "person", label: "Full name", field: "name" },
        { icon: "mail", label: "Email address", field: "email", type: "email" },
        { icon: "call", label: "Phone number", field: "phone" },
        { icon: "calendar_today", label: "Date of birth", field: "dateOfBirth", type: "date" },
        { icon: "home_pin", label: "Address", field: "address", wide: true },
      ],
    },
    {
      title: "Academic details",
      fields: [
        { icon: "school", label: "Class", field: "class" },
        { icon: "apartment", label: "School name", field: "schoolname" },
        { icon: "verified_user", label: "Role", field: "role" },
      ],
    },
    {
      title: "Guardian information",
      fields: [
        { icon: "supervisor_account", label: "Guardian name", field: "guardianName" },
        { icon: "phone_in_talk", label: "Guardian phone", field: "guardianPhone" },
      ],
    },
  ];

  const firstName = (profileData.name || storedUser.name || "Student").split(" ")[0] || "Student";

  return (
    <DashboardLayout bgColor="transparent">
      <main className="student-page">
        <StudentTopbar title="Profile" />

        <StudentHero
          kicker="Student profile"
          title={`${firstName}, keep your academic identity up to date.`}
          description="Manage your contact details, class information, guardian contacts, and profile summary in a focused student portal layout."
          primary={{ label: isEditing ? "Save Profile" : "Edit Profile", icon: isEditing ? "save" : "edit", onClick: isEditing ? handleSave : handleEdit }}
          secondary={{ label: isEditing ? "Cancel" : "Back to Student Panel", onClick: isEditing ? handleCancel : () => navigate("/student-panel") }}
          metrics={[
            { value: profileData.user_id || "-", label: "Student ID" },
            { value: displayValue(profileData.role), label: "Portal role" },
            { value: profileData.is_active === false ? "Inactive" : "Active", label: "Account status" },
          ]}
        />

        {message && <p className="student-form-note student-section">{message}</p>}

        <section className="student-main-grid student-section">
          <aside className="student-card student-profile-card">
            <div className="student-avatar-large">
              {(profileData.name || "S").charAt(0).toUpperCase()}
            </div>
            <h3>{displayValue(profileData.name)}</h3>
            <p>{displayValue(profileData.email)}</p>
            <div className="student-inline-actions" style={{ justifyContent: "center" }}>
              {!isEditing ? (
                <button type="button" className="student-primary-button" onClick={handleEdit}>
                  Edit Profile
                  <span className="material-icons-round">edit</span>
                </button>
              ) : (
                <>
                  <button type="button" className="student-primary-button" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                    <span className="material-icons-round">save</span>
                  </button>
                  <button type="button" className="student-action-button" onClick={handleCancel}>
                    Cancel
                    <span className="material-icons-round">close</span>
                  </button>
                </>
              )}
            </div>
          </aside>

          <section className="student-grid-2">
            <StudentStatCard icon="assignment_turned_in" label="Total Exams" value="24" detail="Assigned and completed" tone="green" />
            <StudentStatCard icon="trending_up" label="Average Score" value="86%" detail="Current performance" tone="teal" />
          </section>
        </section>

        <section className="student-grid-2 student-section">
          {fieldGroups.map((group) => (
            <article className="student-card" key={group.title}>
              <div className="student-card-head">
                <div>
                  <span className="student-overline">Profile details</span>
                  <h3>{group.title}</h3>
                </div>
              </div>

              {isEditing ? (
                <div className="student-form-grid">
                  {group.fields.map((field) => (
                    <div className="student-form-field" key={field.field} style={field.wide ? { gridColumn: "1 / -1" } : undefined}>
                      <label htmlFor={`profile-${field.field}`}>{field.label}</label>
                      {field.wide ? (
                        <textarea
                          id={`profile-${field.field}`}
                          value={editedData[field.field] || ""}
                          onChange={(event) => updateEditedData(field.field, event.target.value)}
                        />
                      ) : (
                        <input
                          id={`profile-${field.field}`}
                          type={field.type || "text"}
                          value={editedData[field.field] || ""}
                          onChange={(event) => updateEditedData(field.field, event.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="student-info-list">
                  {group.fields.map((field) => (
                    <div className="student-info-item" key={field.field}>
                      <span className="material-icons-round">{field.icon}</span>
                      <div>
                        <small>{field.label}</small>
                        <strong>{displayValue(profileData[field.field])}</strong>
                      </div>
                      <button type="button" aria-label={`Edit ${field.label}`} onClick={handleEdit}>
                        <span className="material-icons-round">edit</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      </main>
    </DashboardLayout>
  );
}

export default ViewProfile;
