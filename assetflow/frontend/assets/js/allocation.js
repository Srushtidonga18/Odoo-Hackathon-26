/**
 * AssetFlow Allocation & Transfer JS
 * Manages allocation tables, status approvals/rejections, and assignment requests.
 */

let allocTable = null;
let allocModal = null;

// Keep track of loaded assets globally in this page context
let loadedAssets = [];

document.addEventListener('DOMContentLoaded', async () => {
  window.AssetFlowLoader.show();
  try {
    allocModal = new bootstrap.Modal(document.getElementById('allocModal'));
    await loadAllocations();
    await initializeWorkspace();
    setupEventListeners();
  } catch (err) {
    console.error(err);
  } finally {
    window.AssetFlowLoader.hide();
  }
});

async function loadAllocations() {
  try {
    const allocations = await window.ApiService.allocations.list();
    renderAllocationsTable(allocations);
  } catch (err) {
    console.error(err);
  }
}

async function initializeWorkspace() {
  try {
    loadedAssets = await window.ApiService.assets.list();
    
    // Fill workspace asset dropdown
    const assetSelect = document.getElementById('workspace-asset-select');
    if (assetSelect) {
      let html = '<option value="">-- Choose an asset --</option>';
      loadedAssets.forEach(a => {
        const assignedInfo = a.owner ? ` [Allocated to ${a.owner}]` : ' [Available]';
        html += `<option value="${a.id}">${a.id} - ${a.name}${assignedInfo}</option>`;
      });
      assetSelect.innerHTML = html;
    }

    // Fill workspace transfer target dropdown
    const transferToSelect = document.getElementById('workspace-transfer-to');
    if (transferToSelect) {
      const employees = ['Raj Malhotra', 'Arjun Nair', 'Priya Shah', 'Rahul Varma', 'Rahul Sharma', 'Amit Patel', 'Amit Rao', 'Saad Iqbal'];
      let html = '<option value="">Select Employee...</option>';
      employees.forEach(emp => {
        html += `<option value="${emp}">${emp}</option>`;
      });
      transferToSelect.innerHTML = html;
    }
  } catch (err) {
    console.error(err);
  }
}

function handleAssetSelection(assetId) {
  const conflictCard = document.getElementById('workspace-alloc-conflict-card');
  const conflictMessage = document.getElementById('workspace-conflict-message');
  const transferForm = document.getElementById('workspace-transfer-form');
  const standardForm = document.getElementById('workspace-standard-alloc-form');
  const transferFromInput = document.getElementById('workspace-transfer-from');
  const historySection = document.getElementById('workspace-alloc-history-section');
  const historyList = document.getElementById('workspace-alloc-history-list');

  if (!assetId) {
    conflictCard.classList.add('d-none');
    transferForm.classList.add('d-none');
    standardForm.classList.add('d-none');
    historySection.classList.add('d-none');
    return;
  }

  const asset = loadedAssets.find(a => String(a.id) === String(assetId));
  if (!asset) return;

  historySection.classList.remove('d-none');

  // Populate history
  let historyHtml = '';
  if (asset.id === 'AF-0114') {
    historyHtml = `
      <div class="p-2 border-bottom border-secondary-subtle">
        <i class="fa-solid fa-clock-rotate-left me-2 text-primary"></i><strong>Mar 12</strong> - Allocated to Priya Shah (Engineering)
      </div>
      <div class="p-2">
        <i class="fa-solid fa-clock-rotate-left me-2 text-muted"></i><strong>Jan 04</strong> - Returned by Arjun Nair (Condition: Good)
      </div>
    `;
  } else if (asset.id === 'AST-001') {
    historyHtml = `
      <div class="p-2">
        <i class="fa-solid fa-clock-rotate-left me-2 text-primary"></i><strong>Jan 15</strong> - Allocated to Rahul Sharma (Management)
      </div>
    `;
  } else if (asset.id === 'AST-002') {
    historyHtml = `
      <div class="p-2">
        <i class="fa-solid fa-clock-rotate-left me-2 text-primary"></i><strong>Feb 10</strong> - Allocated to Amit Patel (Asset Management)
      </div>
    `;
  } else {
    historyHtml = `
      <div class="p-2 text-muted italic">
        No previous allocation history for this asset.
      </div>
    `;
  }
  historyList.innerHTML = historyHtml;

  // Check allocation conflict
  if (asset.owner) {
    // Conflict! Already allocated
    conflictMessage.textContent = `Already Allocated to ${asset.owner} (${asset.id === 'AF-0114' ? 'Engineering' : 'Staff'})`;
    conflictCard.classList.remove('d-none');
    
    // Show Transfer Form
    transferFromInput.value = asset.owner;
    transferForm.classList.remove('d-none');
    standardForm.classList.add('d-none');
  } else {
    // Available
    conflictCard.classList.add('d-none');
    transferForm.classList.add('d-none');
    standardForm.classList.remove('d-none');
    
    // Set default return date to 1 month from now
    const returnDate = document.getElementById('workspace-alloc-date');
    if (returnDate) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      returnDate.value = nextMonth.toISOString().split('T')[0];
    }
  }
}

function renderAllocationsTable(allocations) {
  const tbody = document.querySelector('#allocations-table tbody');
  if (!tbody) return;

  if ($.fn.DataTable.isDataTable('#allocations-table')) {
    $('#allocations-table').DataTable().destroy();
  }

  let html = '';
  const role = window.RbacService.getCurrentUserRole();
  const canApprove = (role === 'Admin' || role === 'Asset Manager' || role === 'AssetManager' || role === 'Department Head' || role === 'DepartmentHead');

  allocations.forEach(alloc => {
    let statusClass = 'bg-warning text-dark';
    let actionButtons = '';
    
    if (alloc.status === 'Approved') {
      statusClass = 'bg-success';
      actionButtons = canApprove ? `
        <button class="btn btn-sm btn-secondary-custom text-danger btn-action" data-action="Returned" title="Mark as Returned">
          <i class="fa-solid fa-arrow-rotate-left me-1"></i>Return
        </button>
      ` : '<span class="text-muted small">Approved</span>';
    } else if (alloc.status === 'Pending Approval') {
      statusClass = 'bg-warning text-dark';
      if (canApprove) {
        actionButtons = `
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success btn-action" data-action="Approved" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
              <i class="fa-solid fa-check me-1"></i>Approve
            </button>
            <button class="btn btn-sm btn-danger btn-action" data-action="Rejected" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
              <i class="fa-solid fa-xmark me-1"></i>Reject
            </button>
          </div>
        `;
      } else {
        actionButtons = '<span class="text-muted small">Pending</span>';
      }
    } else if (alloc.status === 'Rejected') {
      statusClass = 'bg-danger';
      actionButtons = '<span class="text-muted small">--</span>';
    } else {
      statusClass = 'bg-secondary';
      actionButtons = '<span class="text-muted small">--</span>';
    }

    html += `
      <tr data-id="${alloc.id}">
        <td><strong class="text-primary">${alloc.id}</strong></td>
        <td><strong>${alloc.assetId}</strong></td>
        <td>
          <div class="fw-semibold text-dark-custom" style="color: var(--text-color);">${alloc.assetName}</div>
        </td>
        <td>${alloc.allocatedTo}</td>
        <td>${alloc.date}</td>
        <td><span class="badge ${statusClass} rounded-pill px-2.5 py-1">${alloc.status}</span></td>
        <td>${actionButtons}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  allocTable = $('#allocations-table').DataTable({
    pageLength: 10,
    lengthChange: false,
    info: true,
    ordering: false,
    language: {
      search: "",
      searchPlaceholder: "Search allocations..."
    }
  });
}

async function setupEventListeners() {
  // Listen for Workspace asset change
  const workspaceAssetSelect = document.getElementById('workspace-asset-select');
  if (workspaceAssetSelect) {
    workspaceAssetSelect.addEventListener('change', (e) => {
      handleAssetSelection(e.target.value);
    });
  }

  // Submit Standard Workspace Allocation
  const btnSubmitAlloc = document.getElementById('btn-submit-workspace-alloc');
  if (btnSubmitAlloc) {
    btnSubmitAlloc.addEventListener('click', async () => {
      const assetId = document.getElementById('workspace-asset-select').value;
      const allocatedTo = document.getElementById('workspace-alloc-to').value.trim();
      const date = document.getElementById('workspace-alloc-date').value;

      if (!allocatedTo) {
        Swal.fire('Validation Error', 'Please enter who you are allocating this asset to.', 'warning');
        return;
      }

      const asset = loadedAssets.find(a => String(a.id) === String(assetId));
      if (!asset) return;

      window.AssetFlowLoader.show();
      try {
        // Create request
        await window.ApiService.allocations.create({
          assetId: asset.id,
          assetName: asset.name,
          allocatedTo,
          date
        });

        // Set owner in assets db
        const assets = JSON.parse(localStorage.getItem('mock_assets') || '[]');
        const targetAsset = assets.find(a => String(a.id) === String(asset.id));
        if (targetAsset) {
          targetAsset.owner = allocatedTo;
          localStorage.setItem('mock_assets', JSON.stringify(assets));
        }

        Swal.fire({
          title: 'Asset Allocated!',
          text: `${asset.name} has been allocated to ${allocatedTo}.`,
          icon: 'success',
          confirmButtonColor: '#2563EB'
        });

        document.getElementById('workspace-alloc-to').value = '';
        await loadAllocations();
        await initializeWorkspace();
        handleAssetSelection(assetId);
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      } finally {
        window.AssetFlowLoader.hide();
      }
    });
  }

  // Submit Workspace Transfer Request
  const btnSubmitTransfer = document.getElementById('btn-submit-workspace-transfer');
  if (btnSubmitTransfer) {
    btnSubmitTransfer.addEventListener('click', async () => {
      const assetId = document.getElementById('workspace-asset-select').value;
      const transferTo = document.getElementById('workspace-transfer-to').value;
      const reason = document.getElementById('workspace-transfer-reason').value.trim();

      if (!transferTo) {
        Swal.fire('Validation Error', 'Please select the employee to transfer to.', 'warning');
        return;
      }
      if (!reason) {
        Swal.fire('Validation Error', 'Please state the reason for transfer.', 'warning');
        return;
      }

      const asset = loadedAssets.find(a => String(a.id) === String(assetId));
      if (!asset) return;

      window.AssetFlowLoader.show();
      try {
        // Create a pending allocation request
        await window.ApiService.allocations.create({
          assetId: asset.id,
          assetName: asset.name,
          allocatedTo: transferTo,
          date: new Date().toISOString().split('T')[0]
        });

        // Create compliance notification
        await window.ApiService.notifications.create({
          title: `Transfer Request: ${asset.id}`,
          message: `Transfer requested for ${asset.name} from ${asset.owner} to ${transferTo}. Reason: ${reason}`,
          type: 'Approval'
        });

        Swal.fire({
          title: 'Transfer Submitted!',
          text: `Transfer request for ${asset.name} is submitted and awaiting manager approval.`,
          icon: 'success',
          confirmButtonColor: '#2563EB'
        });

        document.getElementById('workspace-transfer-reason').value = '';
        document.getElementById('workspace-transfer-to').value = '';

        await loadAllocations();
        await initializeWorkspace();
        handleAssetSelection(assetId);
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      } finally {
        window.AssetFlowLoader.hide();
      }
    });
  }

  // Modal open (Legacy)
  const openModalBtn = document.getElementById('btn-open-alloc-modal');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', async () => {
      window.AssetFlowLoader.show();
      try {
        const assets = await window.ApiService.assets.list();
        const select = document.getElementById('alloc-asset-id');
        if (select) {
          // Fill only active, non-assigned or assignable assets
          let optionsHtml = '<option value="">Select asset to allocate...</option>';
          assets.forEach(asset => {
            if (asset.status !== 'Disposed') {
              optionsHtml += `<option value="${asset.id}" data-name="${asset.name}">${asset.id} - ${asset.name} (${asset.status})</option>`;
            }
          });
          select.innerHTML = optionsHtml;
        }

        // Set default date to today
        const dateInput = document.getElementById('alloc-date');
        if (dateInput) {
          dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Reset form
        document.getElementById('alloc-form').reset();
        
        // Clear errors
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control, .form-select').forEach(el => el.classList.remove('is-invalid'));

        allocModal.show();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      } finally {
        window.AssetFlowLoader.hide();
      }
    });
  }

  // Approval/Rejection Actions
  $('#allocations-table').on('click', '.btn-action', function() {
    const role = window.RbacService.getCurrentUserRole();
    const canApprove = (role === 'Admin' || role === 'Asset Manager' || role === 'AssetManager' || role === 'Department Head' || role === 'DepartmentHead');
    if (!canApprove) {
      Swal.fire('Access Denied', 'You do not have permission to approve or reject allocation requests.', 'error');
      return;
    }
    const tr = $(this).closest('tr');
    const id = tr.attr('data-id');
    const action = $(this).attr('data-action');

    let confirmTitle = 'Approve Request?';
    let confirmText = `Are you sure you want to approve allocation request ${id}?`;
    let confirmColor = '#10B981';

    if (action === 'Rejected') {
      confirmTitle = 'Reject Request?';
      confirmText = `Are you sure you want to reject allocation request ${id}?`;
      confirmColor = '#EF4444';
    } else if (action === 'Returned') {
      confirmTitle = 'Mark as Returned?';
      confirmText = `Confirm that asset associated with request ${id} has been returned to stock.`;
      confirmColor = '#3B82F6';
    }

    Swal.fire({
      title: confirmTitle,
      text: confirmText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        window.AssetFlowLoader.show();
        try {
          // If returned, clear owner in assets database
          if (action === 'Returned') {
            const currentAllocations = await window.ApiService.allocations.list();
            const targetAlloc = currentAllocations.find(a => String(a.id) === String(id));
            if (targetAlloc) {
              const assets = JSON.parse(localStorage.getItem('mock_assets') || '[]');
              const targetAsset = assets.find(a => String(a.id) === String(targetAlloc.assetId));
              if (targetAsset) {
                targetAsset.owner = '';
                localStorage.setItem('mock_assets', JSON.stringify(assets));
              }
            }
          } else if (action === 'Approved') {
            // Transfer/Approval approved: make owner match targetEmployee
            const currentAllocations = await window.ApiService.allocations.list();
            const targetAlloc = currentAllocations.find(a => String(a.id) === String(id));
            if (targetAlloc) {
              const assets = JSON.parse(localStorage.getItem('mock_assets') || '[]');
              const targetAsset = assets.find(a => String(a.id) === String(targetAlloc.assetId));
              if (targetAsset) {
                targetAsset.owner = targetAlloc.allocatedTo;
                localStorage.setItem('mock_assets', JSON.stringify(assets));
              }
            }
          }

          await window.ApiService.allocations.action(id, action);
          
          Swal.fire({
            title: 'Success',
            text: `Allocation request ${action.toLowerCase()} successfully.`,
            icon: 'success',
            confirmButtonColor: '#2563EB'
          });
          
          await loadAllocations();
          await initializeWorkspace();
          // Reset workspace view
          handleAssetSelection(workspaceAssetSelect.value);
        } catch (err) {
          Swal.fire('Error', err.message, 'error');
        } finally {
          window.AssetFlowLoader.hide();
        }
      }
    });
  });

  // Modal Submit (Legacy)
  const form = document.getElementById('alloc-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear errors
      document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
      document.querySelectorAll('.form-control, .form-select').forEach(el => el.classList.remove('is-invalid'));

      const assetSelect = document.getElementById('alloc-asset-id');
      const assetId = assetSelect.value;
      const assetName = assetSelect.options[assetSelect.selectedIndex]?.getAttribute('data-name') || '';
      const allocatedTo = document.getElementById('alloc-to').value.trim();
      const date = document.getElementById('alloc-date').value;
      const terms = document.getElementById('alloc-terms').checked;

      let isValid = true;

      if (!assetId) {
        showError('alloc-asset-id', 'Please select an asset to allocate.');
        isValid = false;
      }
      if (!allocatedTo) {
        showError('alloc-to', 'Please enter employee name or email.');
        isValid = false;
      }
      if (!date) {
        showError('alloc-date', 'Allocation date is required.');
        isValid = false;
      }
      if (!terms) {
        showError('alloc-terms', 'You must agree to the usage policy.');
        isValid = false;
      }

      if (!isValid) return;

      const spinner = document.getElementById('alloc-spinner');
      const submitBtn = document.getElementById('btn-save-alloc');
      if (spinner) spinner.classList.remove('d-none');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const payload = {
          assetId,
          assetName,
          allocatedTo,
          date
        };

        await window.ApiService.allocations.create(payload);

        Swal.fire({
          title: 'Request Submitted',
          text: 'New allocation request submitted for manager review.',
          icon: 'success',
          confirmButtonColor: '#2563EB'
        });

        allocModal.hide();
        await loadAllocations();
        await initializeWorkspace();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      } finally {
        if (spinner) spinner.classList.add('d-none');
        if (submitBtn) submitBtn.disabled = false;
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
