/**
 * AssetFlow Notifications JS
 * Manages notifications, reading alerts, and clearing active notification profiles.
 */

document.addEventListener('DOMContentLoaded', async () => {
  window.AssetFlowLoader.show();
  try {
    await loadNotifications();
    setupEventListeners();
  } catch (err) {
    console.error(err);
  } finally {
    window.AssetFlowLoader.hide();
  }
});

async function loadNotifications() {
  const container = document.getElementById('notifications-list-container');
  if (!container) return;

  try {
    const list = await window.ApiService.notifications.list();
    
    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state py-5 card-custom">
          <i class="fa-solid fa-bell-slash text-muted d-block fs-2 mb-3"></i>
          <h5 class="fw-bold">All caught up!</h5>
          <p class="text-muted small">You don't have any system notifications at this time.</p>
        </div>
      `;
      return;
    }

    let html = '';
    list.forEach(n => {
      let iconColor = 'text-primary bg-primary-subtle';
      let icon = 'fa-info-circle';
      if (n.type === 'warning') {
        iconColor = 'text-warning bg-warning-subtle';
        icon = 'fa-triangle-exclamation';
      } else if (n.type === 'success') {
        iconColor = 'text-success bg-success-subtle';
        icon = 'fa-circle-check';
      }

      html += `
        <div class="notif-card ${n.read ? '' : 'unread'}" data-id="${n.id}">
          <div class="d-flex align-items-start gap-3">
            <div class="${iconColor} rounded-circle p-2.5 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
              <i class="fa-solid ${icon} fs-5"></i>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-1">
                <h6 class="mb-0 fw-bold text-dark-custom" style="color: var(--text-color);">${n.title}</h6>
                <small class="text-muted fs-8">${n.date}</small>
              </div>
              <p class="text-muted small mb-0">${n.message}</p>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="alert alert-danger">Error loading notifications: ${err.message}</div>`;
  }
}

function setupEventListeners() {
  const container = document.getElementById('notifications-list-container');
  if (container) {
    // Card click event to mark as read
    container.addEventListener('click', async (e) => {
      const card = e.target.closest('.notif-card');
      if (!card || !card.classList.contains('unread')) return;

      const id = card.getAttribute('data-id');
      try {
        await window.ApiService.notifications.markAsRead(id);
        
        // Remove unread visual class
        card.classList.remove('unread');
        
        // Trigger small success toast
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1000,
        });
        Toast.fire({
          icon: 'success',
          title: 'Marked as read'
        });
        
        // Reload notifications in components like dropdown if rendered
        // But since this is a page, just local style change is perfect.
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Clear all button action
  const clearBtn = document.getElementById('btn-clear-all-notifs');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      Swal.fire({
        title: 'Clear All Notifications?',
        text: 'This action will delete all read and unread notifications from your inbox.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Yes, clear all',
        cancelButtonText: 'Cancel'
      }).then(async (result) => {
        if (result.isConfirmed) {
          window.AssetFlowLoader.show();
          try {
            await window.ApiService.notifications.clearAll();
            
            Swal.fire({
              title: 'Cleared',
              text: 'All notifications cleared.',
              icon: 'success',
              confirmButtonColor: '#2563EB'
            });

            await loadNotifications();
          } catch (err) {
            Swal.fire('Error', err.message, 'error');
          } finally {
            window.AssetFlowLoader.hide();
          }
        }
      });
    });
  }
}
