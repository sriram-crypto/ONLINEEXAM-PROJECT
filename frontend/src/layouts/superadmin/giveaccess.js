import React, { useEffect, useState } from "react";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonButton from "components/ArgonButton";
import Box from "@mui/material/Box";
import { GetApp as DownloadIcon } from "@mui/icons-material";
import * as XLSX from "xlsx";

function GiveAccess() {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchPending = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/superadmin/giveaccess/pending");
            const data = await res.json();
            setPendingUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            setError("Failed to fetch pending users.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (user_id) => {
        setError("");
        setSuccess("");
        try {
            const res = await fetch(`/api/admin/giveaccess/approve/${user_id}`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                setSuccess("User approved successfully!");
                fetchPending();
            } else {
                setError(data.error || "Failed to approve user.");
            }
        } catch (err) {
            setError("Failed to approve user.");
        }
    };

    const downloadExcelReport = () => {
        const data = pendingUsers.map(u => ({
            'User ID': u.user_id,
            Name: u.name,
            Email: u.email,
            Role: u.role,
            'School Name': u.schoolname,
            'Phone Number': u.phonenumber,
            Status: u.is_active ? 'Active' : 'Pending',
            'Registration Date': u.created_at ? new Date(u.created_at).toLocaleDateString() : ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pending Users Report");
        XLSX.writeFile(wb, "pending_users_report.xlsx");
    };

    return (
        <ArgonBox 
            sx={{ 
                py: { xs: 2, sm: 3 },
                px: { xs: 2, sm: 3 }
            }}
        >
            <ArgonBox 
                sx={{ 
                    bgcolor: "#fff", 
                    borderRadius: 2, 
                    boxShadow: 3,
                    p: { xs: 2, sm: 3 }
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <ArgonTypography 
                        variant="h4" 
                        sx={{ 
                            fontWeight: 700, 
                            color: '#344767', 
                            letterSpacing: 0.2,
                            fontSize: { xs: '1.5rem', sm: '2rem' }
                        }}
                    >
                        User Approvals
                    </ArgonTypography>
                    <ArgonButton 
                        color="success" 
                        onClick={downloadExcelReport}
                        startIcon={<DownloadIcon />}
                        sx={{ minWidth: 150 }}
                    >
                        Download Report
                    </ArgonButton>
                </Box>
                {error && (
                    <Box sx={{ 
                        background: '#ffeaea', 
                        color: '#d32f2f', 
                        borderRadius: 1.5, 
                        p: 1.5, 
                        mb: 3, 
                        textAlign: 'center', 
                        fontWeight: 500, 
                        fontSize: 15 
                    }}>
                        {error}
                    </Box>
                )}
                {success && (
                    <Box sx={{ 
                        background: '#e7fbe7', 
                        color: '#388e3c', 
                        borderRadius: 1.5, 
                        p: 1.5, 
                        mb: 3, 
                        textAlign: 'center', 
                        fontWeight: 500, 
                        fontSize: 15 
                    }}>
                        {success}
                    </Box>
                )}
                
                {/* Table Container with Horizontal Scroll */}
                <Box 
                    sx={{ 
                        overflowX: 'auto',
                        '&::-webkit-scrollbar': {
                            height: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: '#f1f1f1',
                            borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: '#888',
                            borderRadius: '4px',
                            '&:hover': {
                                background: '#555',
                            },
                        },
                    }}
                >
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        minWidth: "900px"
                    }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa' }}>
                                <th style={{ 
                                    padding: "12px 16px", 
                                    textAlign: "left",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#344767",
                                    borderBottom: "2px solid #e0e0e0"
                                }}>ID</th>
                                <th style={{ 
                                    padding: "12px 16px", 
                                    textAlign: "left",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#344767",
                                    borderBottom: "2px solid #e0e0e0"
                                }}>Name</th>
                                <th style={{ 
                                    padding: "12px 16px", 
                                    textAlign: "left",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#344767",
                                    borderBottom: "2px solid #e0e0e0"
                                }}>Email</th>
                                <th style={{ 
                                    padding: "12px 16px", 
                                    textAlign: "left",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#344767",
                                    borderBottom: "2px solid #e0e0e0"
                                }}>Role</th>
                                <th style={{ 
                                    padding: "12px 16px", 
                                    textAlign: "left",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#344767",
                                    borderBottom: "2px solid #e0e0e0"
                                }}>Class</th>
                                <th style={{ 
                                    padding: "12px 16px", 
                                    textAlign: "left",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#344767",
                                    borderBottom: "2px solid #e0e0e0"
                                }}>School Name</th>
                                <th style={{ 
                                    padding: "12px 16px", 
                                    textAlign: "left",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#344767",
                                    borderBottom: "2px solid #e0e0e0"
                                }}>Created At</th>
                                <th style={{ 
                                    padding: "12px 16px", 
                                    textAlign: "center",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#344767",
                                    borderBottom: "2px solid #e0e0e0"
                                }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td 
                                        colSpan={8} 
                                        style={{ 
                                            textAlign: 'center', 
                                            padding: '24px',
                                            color: "#999",
                                            fontSize: "14px"
                                        }}
                                    >
                                        Loading...
                                    </td>
                                </tr>
                            ) : pendingUsers.length === 0 ? (
                                <tr>
                                    <td 
                                        colSpan={8} 
                                        style={{ 
                                            textAlign: 'center', 
                                            padding: '24px',
                                            color: "#999",
                                            fontSize: "14px"
                                        }}
                                    >
                                        No users pending approval.
                                    </td>
                                </tr>
                            ) : (
                                pendingUsers.map(user => (
                                    <tr 
                                        key={user.user_id}
                                        style={{
                                            borderBottom: "1px solid #f0f0f0",
                                            transition: "background 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <td style={{ 
                                            padding: "12px 16px",
                                            fontSize: "14px",
                                            color: "#344767"
                                        }}>{user.user_id}</td>
                                        <td style={{ 
                                            padding: "12px 16px",
                                            fontSize: "14px",
                                            color: "#344767"
                                        }}>{user.name}</td>
                                        <td style={{ 
                                            padding: "12px 16px",
                                            fontSize: "14px",
                                            color: "#344767",
                                            wordBreak: "break-word"
                                        }}>{user.email}</td>
                                        <td style={{ 
                                            padding: "12px 16px",
                                            fontSize: "14px",
                                            color: "#344767"
                                        }}>{user.role}</td>
                                        <td style={{ 
                                            padding: "12px 16px",
                                            fontSize: "14px",
                                            color: "#344767"
                                        }}>{user.class}</td>
                                        <td style={{ 
                                            padding: "12px 16px",
                                            fontSize: "14px",
                                            color: "#344767"
                                        }}>{user.schoolname}</td>
                                        <td style={{ 
                                            padding: "12px 16px",
                                            fontSize: "13px",
                                            color: "#555"
                                        }}>{user.created_at}</td>
                                        <td style={{ 
                                            padding: "12px 16px",
                                            textAlign: "center"
                                        }}>
                                            <ArgonButton 
                                                color="success" 
                                                size="small" 
                                                onClick={() => handleApprove(user.user_id)}
                                                sx={{ 
                                                    minWidth: { xs: 70, sm: 85 },
                                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                }}
                                            >
                                                Approve
                                            </ArgonButton>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </Box>
            </ArgonBox>
        </ArgonBox>
    );
}

export default GiveAccess;
