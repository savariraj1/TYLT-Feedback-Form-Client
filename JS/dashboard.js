if(sessionStorage.getItem("loggedIn") !== "true"){

    window.location.replace("login.html");

}

const APP_CONFIG = window.APP_CONFIG || {};
const API_BASE_URL = APP_CONFIG.API_BASE_URL || "";
const APP_BASE_URL = APP_CONFIG.APP_BASE_URL || window.location.origin;

let feedbackChart = null;
let ratingChart = null;
let companyChart = null;
let driverChart = null;

// ================= Dashboard =================
async function loadDashboard() {

    try {

        const response = await fetch(`${API_BASE_URL}/api/dashboard`);
        const data = await response.json();
        console.table(data.recent);

        document.getElementById("totalFeedback").innerText = data.totalFeedback;
        document.getElementById("todayFeedback").innerText = data.todayFeedback;
        document.getElementById("averageRating").innerText = "⭐ " + data.averageRating;
        document.getElementById("recommendation").innerText = data.recommendation + "%";

        let rows = "";

        data.recent.forEach(item => {

            rows += `
            <tr data-date="${item.trip_date}">
                <td>${item.booking_id}</td>
                <td>${item.customer_name}</td>
                <td>${item.company_name}</td>
                <td>${item.driver_name}</td>
                <td
                    data-rating="${(item.overall_rating?.match(/⭐/g) || []).length}">
                    ${item.overall_rating || "Pending"}
                </td>
                <td>
                    <button class="btn btn-primary btn-sm copyLinkBtn" data-link="${APP_BASE_URL}/feedbackform.html?feedback=${item.feedback_id}">
                        Link
                    </button>
                </td>
                <td>

                <button
                    class="btn btn-primary btn-sm viewBtn"
                    data-id="${item.feedback_id}">
                    View
                </button>

                ${item.status === "Pending" ? `
                    <button
                        class="btn btn-warning btn-sm editBtn"
                        data-id="${item.feedback_id}">
                        Edit
                    </button>
                ` : ""}

                <button
                    class="btn btn-success btn-sm pdfBtn"
                    data-id="${item.feedback_id}">
                    Download PDF
                </button>

            </td>
            </tr>
            `;

        });

        document.getElementById("feedbackTable").innerHTML = rows;
        filterTable();

    } catch (err) {

        console.error("Dashboard Error:", err);

    }

}
document.addEventListener("click", function (e) {

    const btn = e.target.closest(".pdfBtn");

    if (!btn) return;

    const feedbackId = btn.dataset.id;

    window.open(
        `${API_BASE_URL}/api/export/feedback/${feedbackId}`,
        "_blank"
    );

});


function filterTable() {

    const search = document.getElementById("searchInput").value.toLowerCase();
    const rating = document.getElementById("ratingFilter").value;
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;

    document.querySelectorAll("#feedbackTable tr").forEach(row => {

        const booking = row.cells[0].innerText.toLowerCase();
        const customer = row.cells[1].innerText.toLowerCase();
        const company = row.cells[2].innerText.toLowerCase();
        const driver = row.cells[3].innerText.toLowerCase();

        const rowRating = Number(row.cells[4].dataset.rating);

        const rowDate = row.dataset.date.split("T")[0];

        let show = true;

        if (
            search &&
            !booking.includes(search) &&
            !customer.includes(search) &&
            !company.includes(search) &&
            !driver.includes(search)
        ) {
            show = false;
        }

        if (rating !== "" && rowRating !== Number(rating)) {
            show = false;
        }

        if (from && rowDate < from)
            show = false;

        if (to && rowDate > to)
            show = false;

        row.style.display = show ? "" : "none";

    });

}
// ================= Charts =================

document.getElementById("dashboardSearch")
.addEventListener("keyup", loadCharts);

document.getElementById("dashboardFromDate")
.addEventListener("change", loadCharts);

document.getElementById("dashboardToDate")
.addEventListener("change", loadCharts);

document.getElementById("dashboardRatingFilter")
.addEventListener("change", loadCharts);

document.getElementById("dashboardRefreshBtn")
.addEventListener("click", loadCharts);

document.getElementById("dashboardClearBtn")
.addEventListener("click", () => {

    document.getElementById("dashboardSearch").value = "";
    document.getElementById("dashboardFromDate").value = "";
    document.getElementById("dashboardToDate").value = "";
    document.getElementById("dashboardRatingFilter").value = "";

    loadCharts();

});
async function loadCharts() {

    try {

        const search = document.getElementById("dashboardSearch").value;
        const from = document.getElementById("dashboardFromDate").value;
        const to = document.getElementById("dashboardToDate").value;
        const rating = document.getElementById("dashboardRatingFilter").value;

        const response = await fetch(
        `${API_BASE_URL}/api/analytics?search=${encodeURIComponent(search)}&from=${from}&to=${to}&rating=${rating}`
        );
        // const response = await fetch("http://localhost:5000/api/analytics");
        const data = await response.json();

        // Destroy existing charts
        if (feedbackChart) feedbackChart.destroy();
        if (ratingChart) ratingChart.destroy();
        if (companyChart) companyChart.destroy();
        if (driverChart) driverChart.destroy();

        // Feedback Trend
        feedbackChart = new Chart(
            document.getElementById("feedbackChart"),
            {
                type: "line",
                data: {
                    labels: data.monthly.map(x => x.month),
                    datasets: [{
                        label: "Feedback",
                        data: data.monthly.map(x => x.total),
                        borderWidth: 3,
                        fill: false
                    }]
                }
            }
        );

        // Rating Chart
        // Remove null/empty ratings
       const ratingData = data.ratings.filter(item => item.overall_rating);

        const labels = ratingData.map(item => {

            const rating = item.overall_rating || "";

            if (rating.includes("Excellent")) return "Excellent";
            if (rating.includes("Good")) return "Good";
            if (rating.includes("Average")) return "Average";
            if (rating.includes("Fair")) return "Fair";
            if (rating.includes("Poor")) return "Poor";

            return rating;

        });

        const values = ratingData.map(x => x.total);

        const colors = {
            "Excellent":"#28a745",
            "Good":"#0d6efd",
            "Average":"#ffc107",
            "Fair":"#fd7e14",
            "Poor":"#dc3545"
        };

        ratingChart = new Chart(
            document.getElementById("ratingChart"),
            {
                type:"doughnut",

                data:{

                    labels:labels,

                    datasets:[{

                        data:values,

                        backgroundColor:labels.map(x=>colors[x]),

                        borderColor:"#ffffff",

                        borderWidth:3

                    }]

                },

                options:{

                    cutout:"55%",

                    plugins:{

                        legend:{

                            position:"top",

                            labels:{

                                boxWidth:20,
                                padding:15,
                                font:{
                                    size:14,
                                    weight:"bold"
                                }

                            }

                        }

                    }

                }

            }
        );

        // Company Chart
        companyChart = new Chart(
            document.getElementById("companyChart"),
            {
                type: "bar",
                data: {
                    labels: data.companies.map(x => x.company_name),
                    datasets: [{
                        label: "Feedback",
                        data: data.companies.map(x => x.total)
                    }]
                }
            }
        );

        // Driver Chart
        driverChart = new Chart(
            document.getElementById("driverChart"),
            {
                type: "bar",
                data: {
                    labels: data.drivers.map(x => x.driver_name),
                    datasets: [{
                        label: "Rating",
                        data: data.drivers.map(x => x.rating)
                    }]
                }
            }
        );

    } catch (err) {

        console.error("Analytics Error:", err);

    }

}

// ================= Initial Load =================
loadDashboard();
loadCharts();

setInterval(() => {
    loadDashboard();
    loadCharts();
}, 30000);

// Search
document.getElementById("searchInput").addEventListener("keyup", filterTable);

// Rating
document.getElementById("ratingFilter").addEventListener("change", filterTable);

// From Date
document.getElementById("fromDate").addEventListener("change", filterTable);

// To Date
document.getElementById("toDate").addEventListener("change", filterTable);

// ================= Export Buttons =================
document.getElementById("pdfBtn").addEventListener("click", () => {
    window.open(`${API_BASE_URL}/api/export/pdf`);
});

document.getElementById("excelBtn").addEventListener("click", () => {
    window.open(`${API_BASE_URL}/api/export/excel`);
});


document.getElementById("refreshBtn").addEventListener("click", () => {

    document.getElementById("searchInput").value="";

    document.getElementById("ratingFilter").value="";

    document.getElementById("fromDate").value="";

    document.getElementById("toDate").value="";
    

    loadDashboard();

    loadCharts();

});
// ================= Generate Feedback Link =================
const generateBtn = document.getElementById("generateLinkBtn");

if (generateBtn) {

   generateBtn.addEventListener("click", async () => {

    const feedbackId =
        document.getElementById("feedbackId").value;

    const data = {

        booking_id: document.getElementById("linkBookingId").value,
        customer_name: document.getElementById("linkCustomerName").value,
        company_name: document.getElementById("linkCompany").value,
        driver_name: document.getElementById("linkDriver").value,
        vehicle_number: document.getElementById("linkVehicle").value,
        trip_date: document.getElementById("linkTripDate").value

    };

    let response;

    try {

        if (feedbackId) {

            response = await fetch(

                `${API_BASE_URL}/api/feedback/edit-detail/${feedbackId}`,

                {

                    method: "PUT",

                    headers: {

                        "Content-Type":"application/json"

                    },

                    body: JSON.stringify(data)

                }

            );

        }

        else {

            response = await fetch(

                `${API_BASE_URL}/api/generate-link`,

                {

                    method:"POST",

                    headers:{
                        "Content-Type":"application/json"
                    },

                    body:JSON.stringify(data)

                }

            );

        }

    } catch (error) {

        console.error("Link request failed:", error);
        alert("Unable to connect to the server. Please try again.");
        return;

    }

    let result;

    try {

        result = await response.json();

    } catch (error) {

        console.error("Invalid API response:", error);
        alert("The server returned an invalid response.");
        return;

    }

    if (!response.ok) {

        alert(result.message || "Request failed.");
        return;

    }

    if(result.success){

        bootstrap.Modal
            .getInstance(document.getElementById("createLinkModal"))
            .hide();

        loadDashboard();

    }

});

// =============================
// Copy Link Button
// =============================
document.addEventListener("click", async function (e) {

    const btn = e.target.closest(".copyLinkBtn");

    if (!btn) return;

    // Read the complete link from data-link
    const feedbackLink = btn.dataset.link;

    const message = `Dear Customer,

Thank you for choosing TYLT Mobility.

We value your feedback and would appreciate it if you could take a minute to share your experience.

Please submit your feedback using the link below:

${feedbackLink}

Thank you for helping us improve our service.

Regards,
TYLT Mobility Team`;

    try {

        await navigator.clipboard.writeText(message);

        alert("✅ Feedback message copied successfully.");

    } catch (err) {

        console.error(err);

        alert("Unable to copy message.");

    }

});

}

const dashboardMenu = document.getElementById("dashboardMenu");
const feedbackMenu = document.getElementById("feedbackMenu");

const dashboardSection = document.getElementById("dashboardSection");
const feedbackSection = document.getElementById("feedbackSection");

dashboardMenu.addEventListener("click", () => {

    dashboardSection.style.display = "block";
    feedbackSection.style.display = "none";

    dashboardMenu.classList.add("active");
    feedbackMenu.classList.remove("active");

});

feedbackMenu.addEventListener("click", () => {

    dashboardSection.style.display = "none";
    feedbackSection.style.display = "block";

    dashboardMenu.classList.remove("active");
    feedbackMenu.classList.add("active");

});

document.addEventListener("click", async function (e) {

    if (!e.target.classList.contains("viewBtn")) return;

    const feedbackId = e.target.dataset.id;

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/feedback/${feedbackId}`
        );

        const result = await response.json();

        if (!result.success) {
            alert(result.message);
            return;
        }

        const data = result.data;

        document.getElementById("feedbackDetails").innerHTML = `
            <table class="table table-bordered">

                <tr>
                    <th>Booking ID</th>
                    <td>${data.booking_id}</td>
                </tr>

                <tr>
                    <th>Customer</th>
                    <td>${data.customer_name}</td>
                </tr>

                <tr>
                    <th>Company</th>
                    <td>${data.company_name}</td>
                </tr>

                <tr>
                    <th>Driver</th>
                    <td>${data.driver_name}</td>
                </tr>

                <tr>
                    <th>Vehicle</th>
                    <td>${data.vehicle_number}</td>
                </tr>

                <tr>
                    <th>Trip Date</th>
                    <td>${data.trip_date}</td>
                </tr>

                <tr>
                    <th>Overall Rating</th>
                    <td>${data.overall_rating}</td>
                </tr>

                <tr>
                    <th>Driver Rating</th>
                    <td>${data.driver_rating}</td>
                </tr>

                <tr>
                    <th>Cleanliness</th>
                    <td>${data.cleanliness_rating}</td>
                </tr>

                <tr>
                    <th>Punctuality</th>
                    <td>${data.punctuality_rating}</td>
                </tr>

                <tr>
                    <th>Recommendation</th>
                    <td>${data.recommendation}</td>
                </tr>

                <tr>
                    <th>Comments</th>
                    <td>${data.comments}</td>
                </tr>

            </table>
        `;

        const modal = new bootstrap.Modal(
            document.getElementById("viewModal")
        );

        modal.show();

    } catch (err) {

        console.error(err);

        alert("Unable to load feedback.");

    }

});

// document.addEventListener("click", async function (e) {

//     const btn = e.target.closest(".editBtn");

//     if (!btn) return;

//     const feedbackId = btn.dataset.id;

//     console.log("Feedback ID:", feedbackId);

//     try {

//         const response = await fetch(
//             `http://localhost:5000/api/feedback/${feedbackId}`
//         );

//         console.log("Status:", response.status);

//         const result = await response.json();

//         console.log(result);

//         if (!result.success) {
//             alert(result.message);
//             return;
//         }

//         // Continue filling modal...

//     } catch (err) {

//         console.error(err);
//         alert("Unable to load record.");

//     }

// });

document.getElementById("logoutBtn").addEventListener("click",function(){

    sessionStorage.removeItem("loggedIn");

    window.location.replace("login.html");

});

history.pushState(null,null,location.href);

window.onpopstate=function(){

    history.go(1);

};

document.addEventListener("click", function (e) {

    const btn = e.target.closest(".pdfBtn");

    if (!btn) return;

    const feedbackId = btn.dataset.id;

    window.open(
        `${API_BASE_URL}/api/export/feedback/${feedbackId}`,
        "_blank"
    );

});
document.addEventListener("click", async function (e) {

    const btn = e.target.closest(".editBtn");

    if (!btn) return;

    const id = btn.dataset.id;

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/feedback/${id}`
        );

        const result = await response.json();

        if (!result.success) {
            alert(result.message);
            return;
        }

        const data = result.data;

        document.getElementById("feedbackId").value = data.feedback_id;

        document.getElementById("linkBookingId").value = data.booking_id;
        document.getElementById("linkCustomerName").value = data.customer_name;
        document.getElementById("linkCompany").value = data.company_name;
        document.getElementById("linkTripDate").value =
            data.trip_date?.split("T")[0];

        document.getElementById("linkDriver").value = data.driver_name;
        document.getElementById("linkVehicle").value = data.vehicle_number;

        document.getElementById("linkModalTitle").innerHTML =
            "Edit Booking Details";

        document.getElementById("generateLinkBtn").innerHTML =
            "Update Details";

        new bootstrap.Modal(
            document.getElementById("createLinkModal")
        ).show();

    } catch (err) {

        console.log(err);

        alert("Unable to load record.");

    }

});

function getScore(text) {

    if (!text) return 0;

    // Count ⭐ emojis
    const emojiCount = (text.match(/⭐/g) || []).length;

    if (emojiCount > 0) return emojiCount;

    // If only number stored
    const num = parseInt(text);

    return isNaN(num) ? 0 : num;
}

function getStars(text) {

    const score = getScore(text);

    return "★".repeat(score) + "☆".repeat(5 - score);

}
