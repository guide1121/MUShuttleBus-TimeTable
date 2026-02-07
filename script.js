document.addEventListener("DOMContentLoaded", () => {
  // Constants
  const CSV_URL = "data/schedule.csv";

  // State
  let scheduleData = [];

  // DOM Elements
  const originSelect = document.getElementById("origin");
  const destinationSelect = document.getElementById("destination");
  const resultArea = document.getElementById("result-area");
  const searchBtn = document.getElementById("search-btn");

  // Navbar Logic
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".nav-menu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    document.querySelectorAll(".nav-link").forEach((n) =>
      n.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navMenu.classList.remove("active");
      }),
    );
  }

  // Schedule Logic (Only if elements exist)
  if (originSelect && destinationSelect && resultArea && searchBtn) {
    // Modal Elements
    const modal = document.getElementById("result-modal");
    const closeBtn = document.querySelector(".close-btn");

    // Initialize
    fetchCSV();

    // Event Listeners
    originSelect.addEventListener("change", handleOriginChange);
    searchBtn.addEventListener("click", calculateNextBus);

    // Modal Events
    if (closeBtn && modal) {
      closeBtn.onclick = function () {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.style.display = "none";
        }, 300);
      };

      window.onclick = function (event) {
        if (event.target == modal) {
          modal.classList.remove("show");
          setTimeout(() => {
            modal.style.display = "none";
          }, 300);
        }
      };
    }

    // Functions
    async function fetchCSV() {
      try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.text();
        parseCSV(data);
      } catch (error) {
        console.error("Error fetching CSV:", error);
        showError("ไม่สามารถโหลดข้อมูลตารางเดินรถได้");
      }
    }

    function parseCSV(csvText) {
      const lines = csvText.trim().split("\n");
      const headers = lines[0].trim().split(",");

      scheduleData = lines
        .slice(1)
        .map((line) => {
          if (!line.trim()) return null;
          const values = line.trim().split(",");
          let entry = {};
          headers.forEach((header, index) => {
            const key = header.trim();
            let value = values[index] ? values[index].trim() : "";
            entry[key] = value;
          });
          if (!entry.Time) return null;
          return entry;
        })
        .filter((item) => item !== null);

      populateOriginOptions();
    }

    function populateOriginOptions() {
      const origins = new Set();
      scheduleData.forEach((item) => {
        if (item.Origin) {
          origins.add(item.Origin);
        }
      });

      originSelect.innerHTML =
        '<option value="" disabled selected>เลือกจุดเริ่มต้น</option>';
      Array.from(origins)
        .sort()
        .forEach((origin) => {
          const option = document.createElement("option");
          option.value = origin;
          option.textContent = origin;
          originSelect.appendChild(option);
        });
    }

    function handleOriginChange() {
      const selectedOrigin = originSelect.value;
      destinationSelect.disabled = false;

      const destinations = new Set();
      scheduleData.forEach((item) => {
        if (item.Origin === selectedOrigin && item.Destination) {
          destinations.add(item.Destination);
        }
      });

      destinationSelect.innerHTML =
        '<option value="" disabled selected>เลือกปลายทาง</option>';
      Array.from(destinations)
        .sort()
        .forEach((dest) => {
          const option = document.createElement("option");
          option.value = dest;
          option.textContent = dest;
          destinationSelect.appendChild(option);
        });

      resultArea.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-location-crosshairs"></i>
                <p>เลือกปลายทางเพื่อดูเวลา</p>
            </div>`;

      searchBtn.disabled = true;
    }

    destinationSelect.addEventListener("change", () => {
      if (destinationSelect.value) {
        searchBtn.disabled = false;
      }
    });

    function calculateNextBus() {
      const origin = originSelect.value;
      const destination = destinationSelect.value;

      if (!origin || !destination) return;

      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;

      const possibleBuses = scheduleData.filter((item) => {
        return item.Origin === origin && item.Destination === destination;
      });

      if (possibleBuses.length === 0) {
        showError("ไม่พบข้อมูลการเดินรถสำหรับเส้นทางนี้");
        return;
      }

      possibleBuses.sort(
        (a, b) => timeToMinutes(a.Time) - timeToMinutes(b.Time),
      );

      const remainingBuses = possibleBuses.filter(
        (bus) => timeToMinutes(bus.Time) >= currentTimeInMinutes,
      );

      let displayBuses = [];
      let isTomorrow = false;

      if (remainingBuses.length > 0) {
        displayBuses = remainingBuses;
        isTomorrow = false;
      } else {
        displayBuses = possibleBuses;
        isTomorrow = true;
      }

      displayResult(displayBuses, isTomorrow);

      if (modal) {
        modal.style.display = "flex";
        setTimeout(() => {
          modal.classList.add("show");
        }, 10);
      }
    }

    function timeToMinutes(timeStr) {
      if (!timeStr) return 0;
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    }

    function displayResult(buses, isTomorrow) {
      let titleClass = isTomorrow ? "text-tomorrow" : "text-today";
      let titleText = isTomorrow
        ? "ตารางเดินรถวันพรุ่งนี้ (หมดรอบวันนี้)"
        : "รถที่เหลือของวันนี้";

      let html = `
            <div class="result-header">
                <h3 class="${titleClass}"><i class="fa-regular fa-calendar-days"></i> ${titleText}</h3>
            </div>
            <div class="bus-list">
        `;

      buses.forEach((bus, index) => {
        const isNext = index === 0;
        const highlightClass = isNext ? "next-bus-card" : "standard-bus-card";
        const badge = isNext ? '<span class="next-badge">คันถัดไป</span>' : "";
        const busNo = bus.Bus_No && bus.Bus_No !== "-" ? bus.Bus_No : "-";
        const routeVia =
          bus.Route_Via && bus.Route_Via !== "-" ? bus.Route_Via : "-";
        const driver =
          bus.Driver_Name && bus.Driver_Name !== "-" ? bus.Driver_Name : "-";
        const note = bus.Note
          ? `<div class="note-box"><i class="fa-solid fa-circle-info"></i> ${bus.Note}</div>`
          : "";

        let warningClass = "";
        let timeColorStyle = "";
        if (
          bus.Note &&
          (bus.Note.includes("ขีดฆ่า") || bus.Note.includes("ไม่ชัดเจน"))
        ) {
          warningClass = "warning-mode";
          timeColorStyle = "color: #d48806;";
        }

        html += `
                <div class="card bus-item ${highlightClass} ${warningClass}">
                    <div class="bus-header">
                        <div class="time-display" style="${timeColorStyle}">
                            ${bus.Time}<span class="time-unit">น.</span>
                        </div>
                        ${badge}
                    </div>
                    
                    ${note}

                    <div class="details compact">
                        <div class="detail-row">
                            <span class="label">เบอร์รถ</span>
                            <span class="value">${busNo}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">เส้นทางผ่าน</span>
                            <span class="value">${routeVia}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">คนขับ</span>
                            <span class="value">${driver}</span>
                        </div>
                    </div>
                </div>
            `;
      });

      html += `</div>`;
      resultArea.innerHTML = html;
    }

    function showError(msg) {
      resultArea.innerHTML = `
            <div class="card" style="border-left: 6px solid #ff4d4f;">
                <p style="color: #ff4d4f; text-align: center;">${msg}</p>
            </div>`;
    }
  }
});
