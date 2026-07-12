/**
 * AssetFlow Resource Booking JS
 * Handles resource scheduling calendars, timeline events rendering, and reservation creations/cancellations.
 */

let calendar = null;
let bookingModal = null;

document.addEventListener('DOMContentLoaded', async () => {
  window.AssetFlowLoader.show();
  try {
    bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
    initCalendar();
    await loadBookings();
    setupEventListeners();
  } catch (err) {
    console.error(err);
  } finally {
    window.AssetFlowLoader.hide();
  }
});

function initCalendar() {
  const calendarEl = document.getElementById('calendar-widget');
  if (!calendarEl) return;

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: [],
    eventClick: function(info) {
      const b = info.event.extendedProps;
      Swal.fire({
        title: info.event.title,
        html: `
          <div class="text-start">
            <p><strong>Booked By:</strong> ${b.bookedBy}</p>
            <p><strong>Date:</strong> ${b.date}</p>
            <p><strong>Time Slot:</strong> ${b.startTime} - ${b.endTime}</p>
            <p><strong>Status:</strong> ${b.status}</p>
          </div>
        `,
        icon: 'info',
        confirmButtonColor: '#2563EB'
      });
    }
  });

  calendar.render();
}

async function loadBookings() {
  try {
    const bookings = await window.ApiService.bookings.list();
    const role = window.RbacService.getCurrentUserRole();
    const user = window.RbacService.getCurrentUser();
    const currentUserName = user ? (user.name || user.fullName) : '';
    
    // Filter own bookings if Employee role
    const filteredBookings = role === 'Employee'
      ? bookings.filter(b => b.bookedBy && b.bookedBy.toLowerCase() === currentUserName.toLowerCase())
      : bookings;
    
    // 1. Populate Calendar Events
    const events = [];
    const colors = {
      'Conference Room A': '#2563EB',
      'Conference Room B': '#10B981',
      'Company EV Tesla-01': '#F59E0B',
      'Testing Lab Alpha': '#8B5CF6',
      'AR/VR Headset Kit': '#EF4444'
    };

    filteredBookings.forEach(b => {
      if (b.status === 'Confirmed') {
        events.push({
          title: `${b.resourceName} (${b.bookedBy})`,
          start: `${b.date}T${b.startTime}:00`,
          end: `${b.date}T${b.endTime}:00`,
          color: colors[b.resourceName] || '#64748B',
          extendedProps: b
        });
      }
    });

    if (calendar) {
      calendar.removeAllEvents();
      calendar.addEventSource(events);
    }

    // 2. Populate My Bookings list in the sidebar
    const listTitleEl = document.querySelector('.card-custom h5 i.fa-clock-history')?.parentElement;
    if (listTitleEl) {
      listTitleEl.innerHTML = role === 'Employee' 
        ? `<i class="fa-solid fa-clock-history me-2 text-primary"></i>My Bookings`
        : `<i class="fa-solid fa-clock-history me-2 text-primary"></i>All Bookings`;
    }
    const bookingsListEl = document.getElementById('my-bookings-list');
    if (bookingsListEl) {
      let listHtml = '';
      if (filteredBookings.length === 0) {
        listHtml = `
          <div class="empty-state py-4">
            <i class="fa-solid fa-calendar-xmark d-block fs-3 mb-2 text-muted"></i>
            <p class="text-muted small mb-0">No bookings scheduled.</p>
          </div>
        `;
      } else {
        filteredBookings.forEach(b => {
          let cancelBtnHtml = '';
          if (b.status === 'Confirmed' && role !== 'Employee') {
            cancelBtnHtml = `
              <button class="btn btn-sm btn-link text-danger text-decoration-none fw-semibold p-0 btn-cancel-booking" data-id="${b.id}">
                Cancel Booking
              </button>
            `;
          }

          let statusBadge = 'bg-success';
          if (b.status === 'Cancelled') statusBadge = 'bg-danger';

          listHtml += `
            <div class="border-bottom pb-3 mb-3 last-no-border">
              <div class="d-flex justify-content-between align-items-start mb-1">
                <span class="fw-semibold text-dark-custom" style="color: var(--text-color);">${b.resourceName}</span>
                <span class="badge ${statusBadge} rounded-pill px-2 py-0.5" style="font-size:0.7rem;">${b.status}</span>
              </div>
              <p class="text-muted small mb-1.5"><i class="fa-regular fa-clock me-1"></i>${b.date} (${b.startTime} - ${b.endTime})</p>
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted fs-8">By: ${b.bookedBy}</small>
                ${cancelBtnHtml}
              </div>
            </div>
          `;
        });
      }
      bookingsListEl.innerHTML = listHtml;
    }

  } catch (err) {
    console.error(err);
  }
}

function setupEventListeners() {
  // Modal open
  const openBtn = document.getElementById('btn-open-booking-modal');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      document.getElementById('booking-form').reset();
      
      // Auto-set date to today
      const dateInput = document.getElementById('booking-date');
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

      // Auto-populate logged-in user name
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.name) {
        document.getElementById('booking-name').value = user.name;
      }
      
      // Clear errors
      document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
      document.querySelectorAll('.form-control, .form-select').forEach(el => el.classList.remove('is-invalid'));

      bookingModal.show();
    });
  }

  // Cancel action
  const listEl = document.getElementById('my-bookings-list');
  if (listEl) {
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-cancel-booking');
      if (!btn) return;

      const role = window.RbacService.getCurrentUserRole();
      if (role === 'Employee') {
        Swal.fire('Access Denied', 'Employees are not allowed to cancel bookings.', 'error');
        return;
      }

      const id = btn.getAttribute('data-id');

      Swal.fire({
        title: 'Cancel Booking?',
        text: 'Are you sure you want to cancel this booking reservation?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Yes, cancel booking',
        cancelButtonText: 'No'
      }).then(async (result) => {
        if (result.isConfirmed) {
          window.AssetFlowLoader.show();
          try {
            await window.ApiService.bookings.cancel(id);
            Swal.fire({
              title: 'Cancelled',
              text: 'Booking has been cancelled.',
              icon: 'success',
              confirmButtonColor: '#2563EB'
            });
            await loadBookings();
          } catch (err) {
            Swal.fire('Error', err.message, 'error');
          } finally {
            window.AssetFlowLoader.hide();
          }
        }
      });
    });
  }

  // Modal Submit
  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear errors
      document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
      document.querySelectorAll('.form-control, .form-select').forEach(el => el.classList.remove('is-invalid'));

      const resourceName = document.getElementById('booking-resource').value;
      const bookedBy = document.getElementById('booking-name').value.trim();
      const date = document.getElementById('booking-date').value;
      const startTime = document.getElementById('booking-start').value;
      const endTime = document.getElementById('booking-end').value;

      let isValid = true;

      if (!resourceName) {
        showError('booking-resource', 'Please select a resource.');
        isValid = false;
      }
      if (!bookedBy) {
        showError('booking-name', 'Please enter booking name.');
        isValid = false;
      }
      if (!date) {
        showError('booking-date', 'Please select date.');
        isValid = false;
      }
      if (!startTime) {
        showError('booking-start', 'Start time is required.');
        isValid = false;
      }
      if (!endTime) {
        showError('booking-end', 'End time is required.');
        isValid = false;
      } else if (startTime && endTime && startTime >= endTime) {
        showError('booking-end', 'End time must be after start time.');
        isValid = false;
      }

      if (!isValid) return;

      const spinner = document.getElementById('booking-spinner');
      const submitBtn = document.getElementById('btn-save-booking');
      if (spinner) spinner.classList.remove('d-none');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const payload = {
          resourceName,
          bookedBy,
          date,
          startTime,
          endTime
        };

        await window.ApiService.bookings.create(payload);

        Swal.fire({
          title: 'Booking Confirmed!',
          text: `You have successfully booked ${resourceName}.`,
          icon: 'success',
          confirmButtonColor: '#2563EB'
        });

        bookingModal.hide();
        await loadBookings();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      } finally {
        if (spinner) spinner.classList.add('d-none');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Connect timeline book shortcut
  const timelineBookBtn = document.getElementById('btn-timeline-book-shortcut');
  if (timelineBookBtn) {
    timelineBookBtn.addEventListener('click', () => {
      const resourceVal = document.getElementById('timeline-resource-select').value;
      const openBtn = document.getElementById('btn-open-booking-modal');
      if (openBtn) openBtn.click();
      
      // Auto-set the selected resource in the booking modal select field
      setTimeout(() => {
        const modalSelect = document.getElementById('booking-resource');
        if (modalSelect) {
          if (resourceVal === 'ConfRoomB2') {
            modalSelect.value = 'Conference Room B';
          } else if (resourceVal === 'Tesla01') {
            modalSelect.value = 'Company EV Tesla-01';
          }
        }
      }, 300);
    });
  }

  // Handle timeline resource select toggle
  const resourceSelect = document.getElementById('timeline-resource-select');
  if (resourceSelect) {
    resourceSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      const timelineGrid = document.querySelector('#btn-timeline-book-shortcut').previousElementSibling;
      if (!timelineGrid) return;
      
      if (val === 'ConfRoomB2') {
        timelineGrid.innerHTML = `
          <!-- 9:00 Slot (Booked) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">9:00 AM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 text-white fs-7" style="background-color: var(--primary-color); border: 1px solid rgba(255,255,255,0.1);">
              <div class="fw-semibold">Booked - Procurement Team</div>
              <div class="small opacity-75">9:00 AM to 10:00 AM</div>
            </div>
          </div>

          <!-- 10:00 Slot (Available) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">10:00 AM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 border border-dashed border-secondary-subtle text-muted fs-7 text-center">
              Available slot
            </div>
          </div>

          <!-- 11:00 Slot (Conflict indicator) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">11:00 AM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 fs-7" style="border: 2px dashed #EF4444; background-color: rgba(239, 68, 68, 0.05); color: #EF4444;">
              <div class="fw-bold"><i class="fa-solid fa-circle-xmark me-1"></i>Requested 9:30 to 10:30 - conflict</div>
              <div class="small">Slot is unavailable for booking</div>
            </div>
          </div>

          <!-- 12:00 Slot (Available) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">12:00 PM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 border border-dashed border-secondary-subtle text-muted fs-7 text-center">
              Available slot
            </div>
          </div>

          <!-- 1:00 Slot (Available) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">1:00 PM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 border border-dashed border-secondary-subtle text-muted fs-7 text-center">
              Available slot
            </div>
          </div>
        `;
      } else {
        // Company EV Tesla-01
        timelineGrid.innerHTML = `
          <!-- 9:00 Slot (Available) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">9:00 AM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 border border-dashed border-secondary-subtle text-muted fs-7 text-center">
              Available slot
            </div>
          </div>

          <!-- 10:00 Slot (Booked) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">10:00 AM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 text-white fs-7" style="background-color: var(--primary-color); border: 1px solid rgba(255,255,255,0.1);">
              <div class="fw-semibold">Booked - Executive CEO Travel</div>
              <div class="small opacity-75">10:00 AM to 11:00 AM</div>
            </div>
          </div>

          <!-- 11:00 Slot (Available) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">11:00 AM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 border border-dashed border-secondary-subtle text-muted fs-7 text-center">
              Available slot
            </div>
          </div>

          <!-- 12:00 Slot (Booked) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">12:00 PM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 text-white fs-7" style="background-color: #F59E0B; border: 1px solid rgba(255,255,255,0.1);">
              <div class="fw-semibold">Booked - Logistics Delivery</div>
              <div class="small opacity-75">12:00 PM to 2:00 PM</div>
            </div>
          </div>

          <!-- 1:00 Slot (Booked - continued) -->
          <div class="d-flex align-items-center gap-3">
            <div class="fw-bold text-muted small" style="width: 55px;">1:00 PM</div>
            <div class="flex-grow-1 p-2.5 rounded-3 text-white fs-7 opacity-75" style="background-color: #F59E0B; border: 1px solid rgba(255,255,255,0.1);">
              <div class="fw-semibold">Booked - Logistics Delivery (cont.)</div>
            </div>
          </div>
        `;
      }
    });
  }
}

function showError(id, message) {
  const errEl = document.getElementById(`${id}-error`);
  const inputEl = document.getElementById(id);
  if (errEl) errEl.textContent = message;
  if (inputEl) inputEl.classList.add('is-invalid');
}
