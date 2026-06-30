import React, { useState } from "react";
import { Grid, Card, CardContent, Divider, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SchoolIcon from "@mui/icons-material/School";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonButton from "components/ArgonButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function Cart() {
  // Sample cart items - replace with actual cart data
  const [cartItems, setCartItems] = useState([
    // {
    //   id: 1,
    //   courseName: "Advanced Mathematics",
    //   courseCode: "MATH301",
    //   instructor: "Dr. Smith",
    //   price: 2999,
    //   duration: "12 weeks",
    //   image: "/course-placeholder.jpg"
    // }
  ]);

  const removeFromCart = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <ArgonBox py={3}>
        <Grid container spacing={3}>
          {/* Cart Items Section */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ minHeight: "400px" }}>
              <ArgonBox p={3}>
                <ArgonBox display="flex" alignItems="center" mb={3}>
                  <ShoppingCartIcon sx={{ fontSize: 32, mr: 2, color: "#1976d2" }} />
                  <ArgonTypography variant="h4" fontWeight="bold">
                    My Courses Cart
                  </ArgonTypography>
                  {cartItems.length > 0 && (
                    <ArgonBox ml={2} px={2} py={0.5} sx={{ background: "#e3f2fd", borderRadius: "16px" }}>
                      <ArgonTypography variant="button" fontWeight="bold" color="info">
                        {cartItems.length} {cartItems.length === 1 ? "Course" : "Courses"}
                      </ArgonTypography>
                    </ArgonBox>
                  )}
                </ArgonBox>
                
                <Divider sx={{ mb: 3 }} />

                {cartItems.length === 0 ? (
                  <ArgonBox 
                    display="flex" 
                    flexDirection="column" 
                    alignItems="center" 
                    justifyContent="center" 
                    py={8}
                  >
                    <ArgonBox 
                      sx={{ 
                        width: 120, 
                        height: 120, 
                        borderRadius: "50%", 
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 3,
                        boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)"
                      }}
                    >
                      <ShoppingCartIcon sx={{ fontSize: 60, color: "white" }} />
                    </ArgonBox>
                    <ArgonTypography variant="h5" fontWeight="bold" mb={1}>
                      Your cart is empty
                    </ArgonTypography>
                    <ArgonTypography variant="body2" color="text" textAlign="center" mb={3}>
                      Start adding courses to your cart and build your learning journey!
                    </ArgonTypography>
                    <ArgonButton 
                      variant="gradient" 
                      color="info"
                      size="large"
                      onClick={() => window.location.href = "/dashboard"}
                    >
                      Browse Courses
                    </ArgonButton>
                  </ArgonBox>
                ) : (
                  <ArgonBox>
                    {cartItems.map((item, index) => (
                      <Card 
                        key={item.id} 
                        sx={{ 
                          mb: 2, 
                          border: "1px solid #e0e0e0",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                            transform: "translateY(-2px)"
                          }
                        }}
                      >
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={2}>
                              <ArgonBox 
                                sx={{ 
                                  width: "100%", 
                                  height: 80, 
                                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <SchoolIcon sx={{ fontSize: 40, color: "white" }} />
                              </ArgonBox>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <ArgonTypography variant="h6" fontWeight="bold" mb={0.5}>
                                {item.courseName}
                              </ArgonTypography>
                              <ArgonTypography variant="caption" color="text" display="block">
                                Course Code: {item.courseCode}
                              </ArgonTypography>
                              <ArgonTypography variant="caption" color="text" display="block">
                                Instructor: {item.instructor}
                              </ArgonTypography>
                              <ArgonTypography variant="caption" color="info">
                                Duration: {item.duration}
                              </ArgonTypography>
                            </Grid>
                            <Grid item xs={12} sm={3} textAlign="center">
                              <ArgonTypography variant="h5" fontWeight="bold" color="success">
                                ₹{item.price.toLocaleString()}
                              </ArgonTypography>
                            </Grid>
                            <Grid item xs={12} sm={1} textAlign="center">
                              <IconButton 
                                onClick={() => removeFromCart(item.id)}
                                sx={{ color: "#f44336" }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </ArgonBox>
                )}
              </ArgonBox>
            </Card>
          </Grid>

          {/* Order Summary Section */}
          <Grid item xs={12} lg={4}>
            <Card 
              sx={{ 
                position: "sticky", 
                top: 100,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white"
              }}
            >
              <ArgonBox p={3}>
                <ArgonTypography variant="h5" fontWeight="bold" mb={3} color="white">
                  Order Summary
                </ArgonTypography>
                
                <Divider sx={{ borderColor: "rgba(255,255,255,0.3)", mb: 3 }} />
                
                <ArgonBox display="flex" justifyContent="space-between" mb={2}>
                  <ArgonTypography variant="body2" color="white">
                    Subtotal
                  </ArgonTypography>
                  <ArgonTypography variant="h6" fontWeight="bold" color="white">
                    ₹{calculateTotal().toLocaleString()}
                  </ArgonTypography>
                </ArgonBox>
                
                <ArgonBox display="flex" justifyContent="space-between" mb={2}>
                  <ArgonTypography variant="body2" color="white">
                    Discount
                  </ArgonTypography>
                  <ArgonTypography variant="h6" fontWeight="bold" color="white">
                    ₹0
                  </ArgonTypography>
                </ArgonBox>
                
                <ArgonBox display="flex" justifyContent="space-between" mb={2}>
                  <ArgonTypography variant="body2" color="white">
                    Tax (18% GST)
                  </ArgonTypography>
                  <ArgonTypography variant="h6" fontWeight="bold" color="white">
                    ₹{Math.round(calculateTotal() * 0.18).toLocaleString()}
                  </ArgonTypography>
                </ArgonBox>
                
                <Divider sx={{ borderColor: "rgba(255,255,255,0.3)", my: 3 }} />
                
                <ArgonBox display="flex" justifyContent="space-between" mb={3}>
                  <ArgonTypography variant="h6" fontWeight="bold" color="white">
                    Total
                  </ArgonTypography>
                  <ArgonTypography variant="h4" fontWeight="bold" color="white">
                    ₹{Math.round(calculateTotal() * 1.18).toLocaleString()}
                  </ArgonTypography>
                </ArgonBox>
                
                <ArgonButton 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  disabled={cartItems.length === 0}
                  sx={{ 
                    background: "white",
                    color: "#667eea",
                    fontWeight: "bold",
                    py: 1.5,
                    "&:hover": {
                      background: "#f5f5f5"
                    },
                    "&:disabled": {
                      background: "rgba(255,255,255,0.3)",
                      color: "rgba(255,255,255,0.6)"
                    }
                  }}
                >
                  Proceed to Checkout
                </ArgonButton>
                
                <ArgonBox mt={3} p={2} sx={{ background: "rgba(255,255,255,0.1)", borderRadius: "8px" }}>
                  <ArgonTypography variant="caption" color="white" textAlign="center" display="block">
                    🎓 Lifetime access to all courses
                  </ArgonTypography>
                  <ArgonTypography variant="caption" color="white" textAlign="center" display="block">
                    📜 Certificate of completion
                  </ArgonTypography>
                  <ArgonTypography variant="caption" color="white" textAlign="center" display="block">
                    💯 30-day money-back guarantee
                  </ArgonTypography>
                </ArgonBox>
              </ArgonBox>
            </Card>
          </Grid>
        </Grid>
      </ArgonBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Cart;
