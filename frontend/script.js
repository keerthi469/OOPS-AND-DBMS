const TOTAL_SLOTS = 20;

const HOURLY_RATES = {
BIKE: 10,
CAR: 30,
TRUCK: 60
};

let slots = Array.from({ length: TOTAL_SLOTS }, (_, index) => ({
id: index + 1,
vehicleNumber: null,
ticketId: null
}));

let activeVehicles = {};
let parkingHistory = [];
let totalCollection = 0;
let nextTicketId = 1001;

const parkingGrid = document.getElementById("parkingGrid");
const entryForm = document.getElementById("entryForm");
const exitForm = document.getElementById("exitForm");

function formatCurrency(amount) {
return "₹${amount.toFixed(2)}";
}

function formatDate(date) {
return date.toLocaleString("en-IN");
}

function normalizeVehicleNumber(number) {
return number.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidVehicleNumber(number) {
return /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/.test(number);
}

function getRequiredSlots(type) {
return type === "TRUCK" ? 2 : 1;
}

function findAvailableSlots(requiredSlots) {
for (let start = 0; start <= slots.length - requiredSlots; start++) {
let available = true;

    for (let offset = 0; offset < requiredSlots; offset++) {
        if (slots[start + offset].vehicleNumber !== null) {
            available = false;
            break;
        }
    }

    if (available) {
        return slots.slice(start, start + requiredSlots);
    }
}

return null;

}

function updateDashboard() {
const occupiedCount = slots.filter(
slot => slot.vehicleNumber !== null
).length;

document.getElementById("totalSlots").textContent = TOTAL_SLOTS;
document.getElementById("availableSlots").textContent =
    TOTAL_SLOTS - occupiedCount;
document.getElementById("occupiedSlots").textContent = occupiedCount;
document.getElementById("collection").textContent =
    formatCurrency(totalCollection);

}

function renderParkingGrid() {
parkingGrid.innerHTML = "";

slots.forEach(slot => {
    const slotElement = document.createElement("div");
    const occupied = slot.vehicleNumber !== null;

    slotElement.className = occupied ? "slot occupied" : "slot";

    const number = document.createElement("div");
    number.className = "slot-number";
    number.textContent = `SLOT ${String(slot.id).padStart(2, "0")}`;

    const vehicle = document.createElement("div");
    vehicle.className = "slot-vehicle";
    vehicle.textContent = occupied ? slot.vehicleNumber : "—";

    const status = document.createElement("div");
    status.className = "slot-status";
    status.textContent = occupied ? "Occupied" : "Available";

    slotElement.append(number, vehicle, status);
    parkingGrid.appendChild(slotElement);
});

}

function renderHistory() {
const historyBody = document.getElementById("historyBody");
historyBody.innerHTML = "";

if (parkingHistory.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 7;
    cell.textContent = "No parking records yet.";

    row.appendChild(cell);
    historyBody.appendChild(row);
    return;
}

[...parkingHistory].reverse().forEach(record => {
    const row = document.createElement("tr");

    const values = [
        `#${record.ticketId}`,
        record.vehicleNumber,
        record.type,
        record.slotNumbers.join(", "),
        formatDate(record.entryTime),
        record.status,
        record.status === "COMPLETED"
            ? formatCurrency(record.amount)
            : "Pending"
    ];

    values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
    });

    historyBody.appendChild(row);
});

}

function showMessage(elementId, message, isError = false) {
const element = document.getElementById(elementId);
element.textContent = message;
element.style.color = isError ? "#dc2626" : "#15803d";
}

entryForm.addEventListener("submit", function (event) {
event.preventDefault();

const vehicleNumber = normalizeVehicleNumber(
    document.getElementById("vehicleNumber").value
);

const type = document.getElementById("vehicleType").value;

if (!isValidVehicleNumber(vehicleNumber)) {
    showMessage(
        "entryMessage",
        "Enter a valid number, e.g. TN37AB1234.",
        true
    );
    return;
}

if (!HOURLY_RATES[type]) {
    showMessage("entryMessage", "Select a vehicle type.", true);
    return;
}

if (activeVehicles[vehicleNumber]) {
    showMessage(
        "entryMessage",
        "This vehicle is already parked.",
        true
    );
    return;
}

const requiredSlots = getRequiredSlots(type);
const allocatedSlots = findAvailableSlots(requiredSlots);

if (!allocatedSlots) {
    showMessage(
        "entryMessage",
        type === "TRUCK"
            ? "No two consecutive slots are available for this truck."
            : "Parking is full. No suitable slot is available.",
        true
    );
    return;
}

const ticketId = nextTicketId++;
const entryTime = new Date();

allocatedSlots.forEach(slot => {
    slot.vehicleNumber = vehicleNumber;
    slot.ticketId = ticketId;
});

const record = {
    ticketId,
    vehicleNumber,
    type,
    slotNumbers: allocatedSlots.map(slot => slot.id),
    entryTime,
    exitTime: null,
    amount: 0,
    status: "ACTIVE"
};

activeVehicles[vehicleNumber] = record;
parkingHistory.push(record);

updateDashboard();
renderParkingGrid();
renderHistory();

showMessage(
    "entryMessage",
    `Vehicle parked successfully! Ticket #${ticketId}; slot(s): ${
        record.slotNumbers.join(", ")
    }. Rate: ${formatCurrency(HOURLY_RATES[type])}/hour.`
);

entryForm.reset();

});

exitForm.addEventListener("submit", function (event) {
event.preventDefault();

const vehicleNumber = normalizeVehicleNumber(
    document.getElementById("exitVehicleNumber").value
);

const record = activeVehicles[vehicleNumber];

if (!record) {
    showMessage(
        "exitMessage",
        "No active parking record found for this vehicle.",
        true
    );
    return;
}

const exitTime = new Date();
const elapsedMilliseconds = exitTime - record.entryTime;

// Charge at least one hour and round partial hours upward.
const hours = Math.max(
    1,
    Math.ceil(elapsedMilliseconds / (1000 * 60 * 60))
);

// Optional daily cap: at most 8 hourly rates per 24-hour period.
const billableHours = Math.min(hours, 8);
const amount = billableHours * HOURLY_RATES[record.type];

record.exitTime = exitTime;
record.amount = amount;
record.status = "COMPLETED";

record.slotNumbers.forEach(slotNumber => {
    const slot = slots[slotNumber - 1];
    slot.vehicleNumber = null;
    slot.ticketId = null;
});

delete activeVehicles[vehicleNumber];
totalCollection += amount;

updateDashboard();
renderParkingGrid();
renderHistory();

showMessage(
    "exitMessage",
    `Exit successful! Ticket #${record.ticketId}. Duration: ${
        hours
    } hour(s). Parking fee: ${formatCurrency(amount)}.`
);

exitForm.reset();

});

updateDashboard();
renderParkingGrid();
renderHistory();