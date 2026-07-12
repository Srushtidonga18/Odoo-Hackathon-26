/**
 * AssetFlow Organization Setup JS
 * Handles organization data prefilling, logo upload previews, and validation.
 */

document.addEventListener('DOMContentLoaded', async () => {
  window.AssetFlowLoader.show();
  try {
    await loadOrgDetails();
    setupLogoPreview();
    setupOrgFormSubmit();

    // Show Department Head Assignment control panel for Admins
    const currentUser = window.RbacService.getCurrentUser() || {};
    if (currentUser.role === 'Admin') {
      const card = document.getElementById('dept-heads-assignment-card');
      if (card) card.style.display = 'block';
      await loadDeptHeads();
    }
  } catch (err) {
    console.error(err);
  } finally {
    window.AssetFlowLoader.hide();
  }
});

async function loadOrgDetails() {
  try {
    const org = await window.ApiService.organization.get();
    if (org) {
      document.getElementById('org-name').value = org.name || '';
      document.getElementById('org-code').value = org.code || '';
      document.getElementById('org-industry').value = org.industry || '';
      document.getElementById('org-website').value = org.website || '';
      document.getElementById('org-phone').value = org.phone || '';
      document.getElementById('org-address').value = org.address || '';
      
      if (org.logo) {
        document.getElementById('logo-img-preview').src = org.logo;
      }
    }
  } catch (err) {
    console.error("Failed to load organization profile", err);
  }
}

function setupLogoPreview() {
  const uploadInput = document.getElementById('org-logo-upload');
  const previewImg = document.getElementById('logo-img-preview');
  
  if (uploadInput && previewImg) {
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Size validation: limit to 1MB
        if (file.size > 1024 * 1024) {
          Swal.fire({
            title: 'File Too Large',
            text: 'Logo image must be smaller than 1MB.',
            icon: 'warning',
            confirmButtonColor: '#2563EB'
          });
          uploadInput.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          // Store logo temporarily in user memory or window object
          window.selectedLogoDataUrl = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

function setupOrgFormSubmit() {
  const form = document.getElementById('org-setup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear validation
    document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));

    const name = document.getElementById('org-name').value.trim();
    const code = document.getElementById('org-code').value.trim();
    const industry = document.getElementById('org-industry').value;
    const website = document.getElementById('org-website').value.trim();
    const phone = document.getElementById('org-phone').value.trim();
    const address = document.getElementById('org-address').value.trim();

    let isValid = true;

    if (!name) {
      showFieldError('org-name', 'Organization name is required.');
      isValid = false;
    }

    if (!code) {
      showFieldError('org-code', 'Organization code is required.');
      isValid = false;
    }

    if (website) {
      try {
        new URL(website);
      } catch (_) {
        showFieldError('org-website', 'Please enter a valid website URL (including https://).');
        isValid = false;
      }
    }

    if (!isValid) return;

    // Show loading
    const spinner = document.getElementById('org-spinner');
    const submitBtn = document.getElementById('btn-save-org');
    if (spinner) spinner.classList.remove('d-none');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const payload = {
        name,
        code,
        industry,
        website,
        phone,
        address,
        logo: window.selectedLogoDataUrl || document.getElementById('logo-img-preview').src
      };

      await window.ApiService.organization.save(payload);

      Swal.fire({
        title: 'Settings Saved',
        text: 'Organization details updated successfully.',
        icon: 'success',
        confirmButtonColor: '#2563EB'
      });
    } catch (err) {
      Swal.fire({
        title: 'Save Failed',
        text: err.message,
        icon: 'error',
        confirmButtonColor: '#2563EB'
      });
    } finally {
      if (spinner) spinner.classList.add('d-none');
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function showFieldError(id, msg) {
  const errEl = document.getElementById(`${id}-error`);
  const inputEl = document.getElementById(id);
  if (errEl) errEl.textContent = msg;
  if (inputEl) inputEl.classList.add('is-invalid');
}

async function loadDeptHeads() {
  const container = document.getElementById('dept-heads-table-body');
  if (!container) return;

  try {
    const users = await window.ApiService.users.list();
    const departments = [
      { id: 'IT', name: 'IT & Infrastructure' },
      { id: 'Engineering', name: 'Engineering' },
      { id: 'Human Resources', name: 'Human Resources' },
      { id: 'Marketing', name: 'Marketing' },
      { id: 'Finance', name: 'Finance' }
    ];

    // Filter candidates (non-admins, non-managers)
    const candidates = users.filter(u => u.role === 'Employee' || u.role === 'Department Head' || u.role === 'DepartmentHead');

    let html = '';
    departments.forEach(dept => {
      // Find current head
      const currentHead = users.find(u => u.department === dept.id && (u.role === 'Department Head' || u.role === 'DepartmentHead'));
      
      let optionsHtml = '<option value="">-- Not Assigned --</option>';
      candidates.forEach(cand => {
        const isSelected = currentHead && cand.email === currentHead.email ? 'selected' : '';
        optionsHtml += `<option value="${cand.email}" ${isSelected}>${cand.fullName || cand.name} (${cand.email})</option>`;
      });

      html += `
        <tr>
          <td><strong>${dept.name}</strong></td>
          <td>
            ${currentHead 
              ? `<span class="badge bg-primary-subtle text-primary rounded-pill px-2.5 py-1 fw-medium"><i class="fa-solid fa-user-tie me-1"></i>${currentHead.fullName || currentHead.name}</span>`
              : '<span class="text-muted small">None Assigned</span>'
            }
          </td>
          <td>
            <select class="form-select form-control-custom py-1 fs-7 w-auto d-inline-block" onchange="assignDeptHead('${dept.id}', this.value, '${currentHead ? currentHead.email : ''}')">
              ${optionsHtml}
            </select>
          </td>
        </tr>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.error("Failed to load department heads", err);
  }
}

window.assignDeptHead = async (deptId, newEmail, oldEmail) => {
  window.AssetFlowLoader.show();
  try {
    if (!newEmail && oldEmail) {
      // Demote current head to employee
      await window.ApiService.users.updateRole(oldEmail, 'Employee', deptId);
      Swal.fire({
        title: 'Department Head Removed',
        text: 'The department head was successfully unassigned.',
        icon: 'success',
        confirmButtonColor: '#2563EB'
      });
    } else if (newEmail) {
      await window.ApiService.users.updateRole(newEmail, 'Department Head', deptId);
      Swal.fire({
        title: 'Department Head Assigned',
        text: 'The new department head was assigned successfully.',
        icon: 'success',
        confirmButtonColor: '#2563EB'
      });
    }
    await loadDeptHeads();
  } catch (err) {
    Swal.fire({
      title: 'Assignment Failed',
      text: err.message,
      icon: 'error',
      confirmButtonColor: '#2563EB'
    });
  } finally {
    window.AssetFlowLoader.hide();
  }
};
