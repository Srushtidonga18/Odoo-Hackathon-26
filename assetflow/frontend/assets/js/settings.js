/**
 * AssetFlow Settings JS
 * Manages dashboard display options, toggling themes, and notifications preferences persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
  window.AssetFlowLoader.show();
  try {
    loadSettings();
    setupEventListeners();
  } catch (err) {
    console.error(err);
  } finally {
    window.AssetFlowLoader.hide();
  }
});

function loadSettings() {
  // Theme check
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const darkModeSwitch = document.getElementById('settings-dark-mode');
  if (darkModeSwitch) {
    darkModeSwitch.checked = currentTheme === 'dark';
  }

  // Load notifications settings
  const notifyMaint = localStorage.getItem('notify_maint') !== 'false';
  const notifyAudits = localStorage.getItem('notify_audits') !== 'false';
  const notifyBookings = localStorage.getItem('notify_bookings') !== 'false';
  const displayLang = localStorage.getItem('display_lang') || 'en';

  const maintCheck = document.getElementById('notify-maintenance');
  const auditsCheck = document.getElementById('notify-audits');
  const bookingsCheck = document.getElementById('notify-bookings');
  const langSelect = document.getElementById('settings-lang');

  if (maintCheck) maintCheck.checked = notifyMaint;
  if (auditsCheck) auditsCheck.checked = notifyAudits;
  if (bookingsCheck) bookingsCheck.checked = notifyBookings;
  if (langSelect) langSelect.value = displayLang;
}

function setupEventListeners() {
  const darkModeSwitch = document.getElementById('settings-dark-mode');
  if (darkModeSwitch) {
    darkModeSwitch.addEventListener('change', (e) => {
      const isDark = e.target.checked;
      const newTheme = isDark ? 'dark' : 'light';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);

      // Sync the icon on top navbar
      const navbarThemeBtn = document.getElementById('theme-toggle');
      if (navbarThemeBtn) {
        const icon = navbarThemeBtn.querySelector('i');
        if (icon) {
          icon.className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
      }

      // Dispatch global event for theme changes
      window.dispatchEvent(new Event('themeChanged'));
    });
  }

  const form = document.getElementById('settings-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const maintChecked = document.getElementById('notify-maintenance').checked;
      const auditsChecked = document.getElementById('notify-audits').checked;
      const bookingsChecked = document.getElementById('notify-bookings').checked;
      const langVal = document.getElementById('settings-lang').value;

      // Persist values
      localStorage.setItem('notify_maint', maintChecked);
      localStorage.setItem('notify_audits', auditsChecked);
      localStorage.setItem('notify_bookings', bookingsChecked);
      localStorage.setItem('display_lang', langVal);

      Swal.fire({
        title: 'Settings Saved',
        text: 'System configurations updated successfully.',
        icon: 'success',
        confirmButtonColor: '#2563EB'
      });
    });
  }
  }
}
