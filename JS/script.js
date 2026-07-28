const APP_CONFIG = window.APP_CONFIG || {};
const API_BASE_URL = APP_CONFIG.API_BASE_URL || "";

document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(window.location.search);

    const feedbackId = params.get("feedback");

    console.log(feedbackId);
    loadTripDetails();

    const form = document.getElementById("feedbackForm");

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        const recommendation = document.querySelector('input[name="recommend"]:checked');

        const feedback = {

            booking_id: document.getElementById("bookingId").value,
            customer_name: document.getElementById("customerName").value,
            company_name: document.getElementById("companyName").value,
            trip_date: document.getElementById("tripDate").value,
            driver_name: document.getElementById("driverName").value,
            vehicle_number: document.getElementById("vehicleNumber").value,

            overall_rating: document.getElementById("overallRating").value,
            driver_rating: document.getElementById("driverRating").value,
            cleanliness_rating: document.getElementById("cleanlinessRating").value,
            punctuality_rating: document.getElementById("punctualityRating").value,

            recommendation: recommendation ? recommendation.value : "",

            comments: document.getElementById("comments").value

        };

        try {

            const response = await fetch(`${API_BASE_URL}/api/feedback`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(feedback)

            });

            const result = await response.json();

        if (result.success) {

            form.reset();

            // Hide complete form
            document.getElementById("feedbackContainer").style.display = "none";

            // Show Thank You message
            document.getElementById("thankYouMessage").style.display = "block";

            // Scroll to top
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        } else {
            console.log(result);
            alert(result.message || "Unable to save feedback.");
        }
        } catch (err) {

            console.error(err);

            alert("Server connection failed.");

        }

    });

}

);

async function loadTripDetails() {

    const params = new URLSearchParams(window.location.search);

    const feedbackId = params.get("feedback");

    if (!feedbackId) {

        alert("Invalid Feedback Link");

        return;

    }

    const response = await fetch(
        `${API_BASE_URL}/api/feedback/${feedbackId}`
    );
    const result = await response.json();

    if (!result.success) {

        alert(result.message);

        return;

    }

    const data = result.data;

    const tripDate = new Date(data.trip_date);

    const formattedDate = tripDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

    document.getElementById("bookingId").value = data.booking_id;
    document.getElementById("customerName").value = data.customer_name;
    document.getElementById("companyName").value = data.company_name;
    document.getElementById("tripDate").value = data.trip_date.split("T")[0];
    document.getElementById("driverName").value = data.driver_name;
    document.getElementById("vehicleNumber").value = data.vehicle_number;

}
