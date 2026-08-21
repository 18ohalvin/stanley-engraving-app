<template>
  <div class="store-list-screen">
    
    <!-- Top Header (Matching Customer Dashboard & Engraver Standard) -->
    <header class="dashboard-header">
      <div class="header-inner">
        <!-- Left: Stanley Bear Logo & Title -->
        <div class="header-titles">
          <img 
            :src="logoBlack" 
            alt="Stanley 1913" 
            class="stanley-logo" 
          />
          <h1 class="station-heading">STORE LIST</h1>
          <div class="header-divider"></div>
          <p class="store-location">ALL STORES</p>
        </div>

        <!-- Right: Single Dashboard Action Button -->
        <div class="header-actions">
          <button 
            type="button" 
            class="dashboard-nav-btn"
            @click="router.push('/admin')"
            title="Return to Main Overview Dashboard"
          >
            Dashboard
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="dashboard-body">
      <div class="dashboard-content-wrap">

        <!-- PAGE HEADER / FILTER CONTROLS (Figma 131:2519) -->
        <div class="page-top-bar">
          <div class="title-meta-col">
            <h2 class="page-section-title">STORE LIST</h2>
            <p class="page-section-subtitle">Monitor engraving performance across all stores.</p>
          </div>

          <div class="top-controls-group">
            <!-- Add New Store CTA Button -->
            <button 
              type="button" 
              class="add-store-btn"
              @click="handleOpenAddStore"
              title="Register a new retail store station"
            >
              <span class="plus-sign">+</span>
              <span class="btn-text">Add New Stores</span>
            </button>
          </div>
        </div>

        <!-- STORES DATA TABLE CARD (Figma 111:840) -->
        <div class="store-table-card">
          <div class="table-responsive-wrapper">
            <table class="store-data-table">
              <thead>
                <tr class="table-header-row">
                  <th class="th-cell col-id">ID</th>
                  <th class="th-cell col-store">Store</th>
                  <th class="th-cell col-queue">Current Queue</th>
                  <th class="th-cell col-wait">Est Wait Time</th>
                  <th class="th-cell col-duration">AVG Duration</th>
                  <th class="th-cell col-machine">Machine</th>
                  <th class="th-cell col-status">Status</th>
                  <th class="th-cell col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                <!-- Empty State Row when No Stores are Registered -->
                <tr v-if="storeList.length === 0" class="table-empty-row">
                  <td colspan="8" class="td-cell td-empty-state">
                    <div class="empty-store-container">
                      <div class="empty-store-icon-wrap">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                      </div>
                      <h3 class="empty-store-title">No Stores Added Yet</h3>
                      <p class="empty-store-desc">Start adding your retail store locations to manage engraving stations and staff.</p>
                      <button 
                        type="button" 
                        class="empty-add-store-btn"
                        @click="handleOpenAddStore"
                      >
                        + Add New Store
                      </button>
                    </div>
                  </td>
                </tr>

                <tr 
                  v-for="store in storeList" 
                  :key="store.id" 
                  class="table-data-row"
                >
                  <!-- 1. ID -->
                  <td class="td-cell td-id">
                    <span class="store-id-text">{{ store.code }}</span>
                  </td>

                  <!-- 2. Store Name -->
                  <td class="td-cell td-store">
                    <span class="store-name-text">{{ store.name }}</span>
                  </td>

                  <!-- 3. Current Queue -->
                  <td class="td-cell td-queue">
                    <span class="queue-num-text">{{ formatQueueCount(store.currentQueue) }}</span>
                  </td>

                  <!-- 4. Est Wait Time -->
                  <td class="td-cell td-wait">
                    <span class="wait-time-text">{{ store.estWaitTime }}</span>
                  </td>

                  <!-- 5. AVG Duration with SLA Indicator (Figma 97:583 & 97:606) -->
                  <td class="td-cell td-duration">
                    <div class="avg-duration-cell">
                      <template v-if="store.hasAvgData">
                        <span 
                          class="duration-val-text"
                          :class="{ 'text-over-sla': !store.isOnTrack }"
                        >
                          {{ store.avgDuration }}
                        </span>
                        <span 
                          v-if="store.isOnTrack" 
                          class="sla-track-indicator on-track"
                        >
                          ✓ On track
                        </span>
                        <span 
                          v-else 
                          class="sla-track-indicator over-sla"
                        >
                          ▲ Over SLA
                        </span>
                      </template>
                      <template v-else>
                        <span class="duration-val-text text-no-data">—</span>
                      </template>
                    </div>
                  </td>

                  <!-- 6. Machine -->
                  <td class="td-cell td-machine">
                    <span class="machine-active-text">
                      <strong class="machine-bold">{{ store.activeMachines }}/{{ store.totalMachines }}</strong>
                      <span class="machine-label"> Active</span>
                    </span>
                  </td>

                  <!-- 7. Status -->
                  <td class="td-cell td-status">
                    <span 
                      class="store-status-text"
                      :class="{ 'is-online': store.status === 'Online', 'is-offline': store.status === 'Offline' }"
                    >
                      {{ store.status }}
                    </span>
                  </td>

                  <!-- 8. Action: Customer PWA Visit, Copy URL, Store Info -->
                  <td class="td-cell td-action">
                    <div class="store-actions-group">
                      <!-- Visit Customer PWA Form Button -->
                      <button 
                        type="button" 
                        class="action-icon-btn btn-visit-form"
                        @click.stop="visitCustomerForm(store)"
                        :title="`Open Customer PWA Landing Page for ${store.name}`"
                        aria-label="Visit Customer Form"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </button>

                      <!-- Copy Form URL Button -->
                      <button 
                        type="button" 
                        class="action-icon-btn btn-copy-url"
                        @click.stop="copyFormUrl(store)"
                        :title="`Copy Customer PWA Landing Page URL for ${store.name}`"
                        aria-label="Copy Form URL"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>

                      <!-- Store Info Modal Detail Button -->
                      <button 
                        type="button" 
                        class="see-detail-btn"
                        @click.stop="handleSeeDetail(store)"
                      >
                        Store Info
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>

    <!-- STORE INFO MODAL (Figma 403:483) -->
    <Teleport to="body">
      <div v-if="selectedDetailStore" class="modal-backdrop" @click="selectedDetailStore = null">
        <div class="store-info-modal-card fade-in" @click.stop>
          
          <!-- Modal Header (Figma 402:351) -->
          <div class="store-info-header">
            <div class="store-info-header-left">
              <div class="store-info-badges-row">
                <span class="store-info-code-badge">{{ selectedDetailStore?.code }}</span>
                <span 
                  class="store-info-status-badge"
                  :class="{ 'is-online': selectedDetailStore?.status === 'Online', 'is-offline': selectedDetailStore?.status === 'Offline' }"
                >
                  <span class="status-dot"></span>
                  {{ selectedDetailStore?.status }}
                </span>
              </div>
              <h2 class="store-info-title">{{ selectedDetailStore?.name }}</h2>
              <p class="store-info-address">{{ selectedDetailStore?.address }}</p>
            </div>
            <div class="store-info-header-right">
              <button 
                type="button" 
                class="store-info-trash-btn" 
                @click="handleRemoveStore(selectedDetailStore)" 
                title="Remove Store" 
                aria-label="Remove Store"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
              <button class="store-info-close-btn" @click="selectedDetailStore = null" aria-label="Close">✕</button>
            </div>
          </div>

          <div class="store-info-divider"></div>

          <!-- Store Admins & Operators Section (Figma 402:397) -->
          <div class="store-info-admins-section">
            <div class="admins-section-header">
              <h4 class="admins-title">Store Admins &amp; Operators</h4>
              <span class="admins-assigned-pill">{{ getStoreAdmins(selectedDetailStore).length }} Assigned</span>
            </div>

            <div class="admins-list-container">
              <div v-if="getStoreAdmins(selectedDetailStore).length === 0" class="empty-admins-placeholder" style="padding: 24px 16px; text-align: center; color: #71717A; font-size: 13px; background: #F4F4F5; border-radius: 8px; font-weight: 500;">
                No staff or store operators assigned to {{ selectedDetailStore?.name }} yet.
              </div>
              <div 
                v-for="admin in getStoreAdmins(selectedDetailStore)" 
                :key="admin.id || admin.name"
                class="admin-card-row"
              >
                <div class="admin-card-left">
                  <div class="admin-circle-avatar">
                    {{ getInitials(admin.name) }}
                  </div>
                  <div class="admin-details-block">
                    <div class="admin-name-role-row">
                      <span class="admin-full-name">{{ admin.name }}</span>
                      <span class="admin-role-tag">{{ admin.role || 'Staff Store' }}</span>
                    </div>
                    <div class="admin-code-phone-row">
                      <span class="admin-code-bold">{{ selectedDetailStore?.code }}</span>
                      <span class="admin-phone-gray">{{ admin.whatsapp || '082909012901' }}</span>
                    </div>
                  </div>
                </div>

                <div class="admin-card-right">
                  <button 
                    type="button" 
                    class="btn-contact-admin-black"
                    @click="openWhatsApp(admin.whatsapp || '082909012901', admin.name, selectedDetailStore?.name)"
                  >
                    Contact Admin
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons (Figma 402:468) -->
          <div class="store-info-bottom-actions">
            <button 
              type="button" 
              class="btn-edit-store-info"
              @click="handleOpenEditStore(selectedDetailStore)"
            >
              Edit Store Info
            </button>
            <button 
              type="button" 
              class="btn-store-dashboard-black"
              @click="openStoreDashboard(selectedDetailStore)"
            >
              Store Dashboard
            </button>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- REMOVE STORE CONFIRMATION MODAL -->
    <Teleport to="body">
      <div v-if="showRemoveConfirmModal" class="modal-backdrop" @click="showRemoveConfirmModal = false">
        <div class="product-modal-card fade-in" style="max-width: min(94vw, 440px);" @click.stop>
          <div class="modal-header-row">
            <h3 class="modal-title-bold" style="color: #DC2626;">Remove Retail Store</h3>
            <button type="button" class="modal-close-icon-btn" @click="showRemoveConfirmModal = false" aria-label="Close">
              ✕
            </button>
          </div>

          <div class="modal-form-content" style="padding-top: 8px;">
            <p style="font-size: 14px; color: #374151; line-height: 1.5;">
              Are you sure you want to remove <strong>{{ storeToRemove?.name }}</strong> ({{ storeToRemove?.code }}) from the store network?
            </p>
            <p style="font-size: 12px; color: #6B7280; margin-top: 8px;">
              This store will be deleted from the database and removed across all connected devices.
            </p>

            <div class="modal-actions-row" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
              <button 
                type="button" 
                class="btn-edit-store-info" 
                style="flex: 1;"
                @click="showRemoveConfirmModal = false"
              >
                Cancel
              </button>
              <button 
                type="button" 
                class="btn-remove-store-confirm" 
                style="flex: 1; height: 48px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"
                @click="confirmRemoveStore"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ADD NEW STORE MODAL (Figma 403:500) -->
    <Teleport to="body">
      <div v-if="showAddStoreModal" class="modal-backdrop" @click="showAddStoreModal = false">
        <div class="product-modal-card fade-in" style="max-width: min(94vw, 610px);" @click.stop>
          <div class="modal-header-row">
            <h3 class="modal-title-bold">Add New Retail Store</h3>
            <button type="button" class="modal-close-icon-btn" @click="showAddStoreModal = false" aria-label="Close">
              ✕
            </button>
          </div>

          <form @submit.prevent="saveNewStore" class="modal-form-content">
            <div class="two-images-upload-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">Store ID / Code*</label>
                <input 
                  v-model="newStoreForm.code" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. EG-029 or MKG-04" 
                  required 
                />
              </div>
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">Store Name*</label>
                <input 
                  v-model="newStoreForm.name" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. Stanley Pondok Indah Mall 3" 
                  required 
                />
              </div>
            </div>

            <div class="two-images-upload-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">City / Region*</label>
                <input 
                  v-model="newStoreForm.city" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. Jakarta Selatan" 
                  required 
                />
              </div>
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">Total Laser Machines*</label>
                <div class="machine-picker-pills-row">
                  <button 
                    v-for="num in [1, 2]" 
                    :key="num"
                    type="button" 
                    class="option-pill"
                    :class="{ 'is-selected': newStoreForm.totalMachines === num }"
                    @click="newStoreForm.totalMachines = num"
                  >
                    {{ num }} {{ num === 1 ? 'Unit' : 'Unit' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="product-name-input-block">
              <label class="param-col-title" style="display:block; margin-bottom: 4px;">Store Location / Address</label>
              <input 
                v-model="newStoreForm.address" 
                type="text" 
                class="product-name-underline-input" 
                placeholder="e.g. Grand Indonesia West Mall, Level 2, Jakarta Pusat" 
              />
            </div>

            <div class="product-name-input-block">
              <label class="param-col-title" style="display:block; margin-bottom: 4px;">Store Phone / WhatsApp Number</label>
              <input 
                v-model="newStoreForm.phone" 
                type="tel" 
                class="product-name-underline-input" 
                placeholder="e.g. +62 817-5566-7788" 
              />
            </div>

            <!-- Store Admins & Operators Management (Figma 411:603) -->
            <div class="edit-store-admins-block">
              <div class="edit-admins-header">
                <label class="param-col-title">Store Admins &amp; Operators</label>
              </div>

              <!-- Search Staff + Add Contact (Figma 411:674) -->
              <div class="admin-search-action-row">
                <div class="admin-search-input-wrap">
                  <svg class="admin-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21 21L16.65 16.65" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <input 
                    v-model="addStaffSearchQuery" 
                    type="text" 
                    class="admin-search-input" 
                    placeholder="Search Staff Name"
                    @focus="showAddStaffDropdown = true"
                  />
                </div>
                <button 
                  type="button" 
                  class="btn-add-contact-black"
                  :disabled="!addSelectedStaffId"
                  @click="handleAddContactToAdd"
                >
                  Add Contact
                </button>
              </div>

              <!-- Staff Search Dropdown (Figma 411:844) -->
              <div v-if="showAddStaffDropdown && filteredStaffForAdd.length > 0" class="staff-dropdown-container fade-in">
                <div 
                  v-for="staff in filteredStaffForAdd" 
                  :key="staff.id" 
                  class="staff-dropdown-item"
                  :class="{ 'is-selected': addSelectedStaffId === staff.id }"
                  @click="handleSelectStaffForAdd(staff.id)"
                >
                  <div class="staff-radio-icon">
                    <div v-if="addSelectedStaffId === staff.id" class="radio-circle-active">
                      <div class="radio-dot"></div>
                    </div>
                    <div v-else class="radio-circle-inactive"></div>
                  </div>
                  <div class="staff-item-info">
                    <span class="staff-item-name">{{ staff.name }}</span>
                    <span class="staff-item-role">{{ staff.role }}</span>
                    <span class="staff-item-phone">{{ staff.whatsapp || '081234000111' }}</span>
                  </div>
                </div>
              </div>

              <!-- Assigned Admins List Rows (Figma 411:608) -->
              <div v-if="assignedStaffInAdd.length > 0" class="assigned-admins-list-wrap">
                <div 
                  v-for="staff in assignedStaffInAdd" 
                  :key="staff.id" 
                  class="assigned-admin-row-card"
                >
                  <div class="admin-card-left">
                    <div class="admin-avatar-circle">
                      {{ getInitials(staff.name) }}
                    </div>
                    <div class="admin-card-details">
                      <div class="admin-name-role-row">
                        <span class="admin-name-bold">{{ staff.name }}</span>
                        <span class="admin-role-badge">{{ staff.role }}</span>
                      </div>
                      <div class="admin-phone-info-row">
                        <span class="admin-code-bold">{{ newStoreForm.code || staff.staffId || 'EG-021' }}</span>
                        <span class="admin-phone-gray">{{ staff.whatsapp || '082909012901' }}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    class="btn-admin-trash-box"
                    @click="handleRemoveStaffFromAdd(staff.id)"
                    title="Remove operator from store"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.45 4.06H15.27V3.56C15.27 3.16218 15.112 2.78064 14.8307 2.49934C14.5494 2.21804 14.1678 2.06 13.77 2.06H10.23C9.83217 2.06 9.45064 2.21804 9.16934 2.49934C8.88804 2.78064 8.73 3.16218 8.73 3.56V4.06H4.55C4.41739 4.06 4.29021 4.11268 4.19645 4.20645C4.10268 4.30021 4.05 4.42739 4.05 4.56C4.05 4.69261 4.10268 4.81979 4.19645 4.91355C4.29021 5.00732 4.41739 5.06 4.55 5.06H5.27L5.69 19.51C5.70646 20.1614 5.97733 20.7805 6.44459 21.2347C6.91186 21.6889 7.53838 21.942 8.19 21.94H15.81C16.4616 21.942 17.0881 21.6889 17.5554 21.2347C18.0227 20.7805 18.2935 20.1614 18.31 19.51L18.73 5.06H19.45C19.5826 5.06 19.7098 5.00732 19.8036 4.91355C19.8973 4.81979 19.95 4.69261 19.95 4.56C19.95 4.42739 19.8973 4.30021 19.8036 4.20645C19.7098 4.11268 19.5826 4.06 19.45 4.06ZM9.73 3.56C9.73 3.42739 9.78268 3.30021 9.87645 3.20645C9.97021 3.11268 10.0974 3.06 10.23 3.06H13.77C13.9026 3.06 14.0298 3.11268 14.1236 3.20645C14.2173 3.30021 14.27 3.42739 14.27 3.56V4.06H9.73V3.56ZM17.31 19.48C17.2996 19.8709 17.1369 20.2422 16.8568 20.5149C16.5766 20.7876 16.201 20.9401 15.81 20.94H8.19C7.79901 20.9401 7.42342 20.7876 7.14324 20.5149C6.86305 20.2422 6.70043 19.8709 6.69 19.48L6.26 5.06H17.74L17.31 19.48Z" fill="black"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Global Modal Action Buttons (Figma 403:516) -->
            <div class="modal-bottom-actions-row">
              <button 
                type="button" 
                class="btn-figma-cancel"
                @click="showAddStoreModal = false"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn-figma-save"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- EDIT STORE INFO MODAL (Figma 403:500) -->
    <Teleport to="body">
      <div v-if="showEditStoreModal" class="modal-backdrop" @click="showEditStoreModal = false">
        <div class="product-modal-card fade-in" style="max-width: min(94vw, 610px);" @click.stop>
          <div class="modal-header-row">
            <h3 class="modal-title-bold">Edit Store Info</h3>
            <button type="button" class="modal-close-icon-btn" @click="showEditStoreModal = false" aria-label="Close">
              ✕
            </button>
          </div>

          <form @submit.prevent="saveEditStore" class="modal-form-content">
            <div class="two-images-upload-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">Store ID / Code*</label>
                <input 
                  v-model="editStoreForm.code" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. EG-021 or PIM-05" 
                  required 
                />
              </div>
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">Store Name*</label>
                <input 
                  v-model="editStoreForm.name" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. Grand Indonesia" 
                  required 
                />
              </div>
            </div>

            <div class="two-images-upload-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">City / Region*</label>
                <input 
                  v-model="editStoreForm.city" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. Jakarta Pusat" 
                  required 
                />
              </div>
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">Total Laser Machines*</label>
                <div class="machine-picker-pills-row">
                  <button 
                    v-for="num in [1, 2]" 
                    :key="num"
                    type="button" 
                    class="option-pill"
                    :class="{ 'is-selected': editStoreForm.totalMachines === num }"
                    @click="editStoreForm.totalMachines = num"
                  >
                    {{ num }} {{ num === 1 ? 'Unit' : 'Unit' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="product-name-input-block">
              <label class="param-col-title" style="display:block; margin-bottom: 4px;">Store Location / Address</label>
              <input 
                v-model="editStoreForm.address" 
                type="text" 
                class="product-name-underline-input" 
                placeholder="e.g. Grand Indonesia West Mall, Level 2, Jakarta Pusat" 
              />
            </div>

            <div class="product-name-input-block">
              <label class="param-col-title" style="display:block; margin-bottom: 4px;">Store Phone / WhatsApp Number</label>
              <input 
                v-model="editStoreForm.phone" 
                type="tel" 
                class="product-name-underline-input" 
                placeholder="e.g. +62 817-5566-7788" 
              />
            </div>

            <!-- Store Admins & Operators Management Section (Figma 411:603) -->
            <div class="edit-store-admins-block">
              <div class="edit-admins-header">
                <label class="param-col-title">Store Admins &amp; Operators</label>
              </div>

              <!-- Search Staff + Add Contact (Figma 411:674) -->
              <div class="admin-search-action-row">
                <div class="admin-search-input-wrap">
                  <svg class="admin-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21 21L16.65 16.65" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <input 
                    v-model="editStaffSearchQuery" 
                    type="text" 
                    class="admin-search-input" 
                    placeholder="Search Staff Name"
                    @focus="showEditStaffDropdown = true"
                  />
                </div>
                <button 
                  type="button" 
                  class="btn-add-contact-black"
                  :disabled="!editSelectedStaffId"
                  @click="handleAddContactToEdit"
                >
                  Add Contact
                </button>
              </div>

              <!-- Staff Search Dropdown (Figma 411:844) -->
              <div v-if="showEditStaffDropdown && filteredStaffForEdit.length > 0" class="staff-dropdown-container fade-in">
                <div 
                  v-for="staff in filteredStaffForEdit" 
                  :key="staff.id" 
                  class="staff-dropdown-item"
                  :class="{ 'is-selected': editSelectedStaffId === staff.id }"
                  @click="handleSelectStaffForEdit(staff.id)"
                >
                  <div class="staff-radio-icon">
                    <div v-if="editSelectedStaffId === staff.id" class="radio-circle-active">
                      <div class="radio-dot"></div>
                    </div>
                    <div v-else class="radio-circle-inactive"></div>
                  </div>
                  <div class="staff-item-info">
                    <span class="staff-item-name">{{ staff.name }}</span>
                    <span class="staff-item-role">{{ staff.role }}</span>
                    <span class="staff-item-phone">{{ staff.whatsapp || '081234000111' }}</span>
                  </div>
                </div>
              </div>

              <!-- Assigned Admins List Rows (Figma 411:608) -->
              <div v-if="assignedStaffInEdit.length > 0" class="assigned-admins-list-wrap">
                <div 
                  v-for="staff in assignedStaffInEdit" 
                  :key="staff.id" 
                  class="assigned-admin-row-card"
                >
                  <div class="admin-card-left">
                    <div class="admin-avatar-circle">
                      {{ getInitials(staff.name) }}
                    </div>
                    <div class="admin-card-details">
                      <div class="admin-name-role-row">
                        <span class="admin-name-bold">{{ staff.name }}</span>
                        <span class="admin-role-badge">{{ staff.role }}</span>
                      </div>
                      <div class="admin-phone-info-row">
                        <span class="admin-code-bold">{{ editStoreForm.code || staff.staffId || 'EG-021' }}</span>
                        <span class="admin-phone-gray">{{ staff.whatsapp || '082909012901' }}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    class="btn-admin-trash-box"
                    @click="handleRemoveStaffFromEdit(staff.id)"
                    title="Remove operator from store"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.45 4.06H15.27V3.56C15.27 3.16218 15.112 2.78064 14.8307 2.49934C14.5494 2.21804 14.1678 2.06 13.77 2.06H10.23C9.83217 2.06 9.45064 2.21804 9.16934 2.49934C8.88804 2.78064 8.73 3.16218 8.73 3.56V4.06H4.55C4.41739 4.06 4.29021 4.11268 4.19645 4.20645C4.10268 4.30021 4.05 4.42739 4.05 4.56C4.05 4.69261 4.10268 4.81979 4.19645 4.91355C4.29021 5.00732 4.41739 5.06 4.55 5.06H5.27L5.69 19.51C5.70646 20.1614 5.97733 20.7805 6.44459 21.2347C6.91186 21.6889 7.53838 21.942 8.19 21.94H15.81C16.4616 21.942 17.0881 21.6889 17.5554 21.2347C18.0227 20.7805 18.2935 20.1614 18.31 19.51L18.73 5.06H19.45C19.5826 5.06 19.7098 5.00732 19.8036 4.91355C19.8973 4.81979 19.95 4.69261 19.95 4.56C19.95 4.42739 19.8973 4.30021 19.8036 4.20645C19.7098 4.11268 19.5826 4.06 19.45 4.06ZM9.73 3.56C9.73 3.42739 9.78268 3.30021 9.87645 3.20645C9.97021 3.11268 10.0974 3.06 10.23 3.06H13.77C13.9026 3.06 14.0298 3.11268 14.1236 3.20645C14.2173 3.30021 14.27 3.42739 14.27 3.56V4.06H9.73V3.56ZM17.31 19.48C17.2996 19.8709 17.1369 20.2422 16.8568 20.5149C16.5766 20.7876 16.201 20.9401 15.81 20.94H8.19C7.79901 20.9401 7.42342 20.7876 7.14324 20.5149C6.86305 20.2422 6.70043 19.8709 6.69 19.48L6.26 5.06H17.74L17.31 19.48Z" fill="black"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Global Modal Action Buttons (Figma 403:516) -->
            <div class="modal-bottom-actions-row">
              <button 
                type="button" 
                class="btn-figma-cancel"
                @click="showEditStoreModal = false"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn-figma-save"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- SUCCESS TOAST NOTIFICATION -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="toastVisible" class="toast-notification">
          <div class="toast-icon">✓</div>
          <span class="toast-text">{{ toastMessage }}</span>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import logoBlack from '../assets/images/logo-black.png';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQueueStore } from '../store/queueStore.js';
import { getAnalyticsLogs } from '../utils/analyticsService.js';

const router = useRouter();
const queueStore = useQueueStore();

// Toast Feedback State
const toastMessage = ref('');
const toastVisible = ref(false);

function triggerToast(msg) {
  toastMessage.value = msg;
  toastVisible.value = true;
  setTimeout(() => {
    toastVisible.value = false;
  }, 2500);
}

function getCleanStoreAlias(store) {
  if (!store) return 'EG-021';
  if (store.code && typeof store.code === 'string' && store.code.trim()) {
    return store.code.trim().toUpperCase();
  }
  if (store.id && !store.id.startsWith('st-custom-')) {
    return String(store.id).trim();
  }
  if (store.name) {
    return String(store.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  return 'EG-021';
}

function visitCustomerForm(store) {
  const storeId = getCleanStoreAlias(store);
  const routeData = router.resolve({
    name: 'engrave-store',
    params: { storeId }
  });
  window.open(routeData.href, '_blank');
}

async function copyFormUrl(store) {
  const storeId = getCleanStoreAlias(store);
  const url = `${window.location.origin}/engrave/${storeId}`;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    triggerToast(`Customer form link for ${store.name} (${storeId}) copied to clipboard!`);
  } catch (err) {
    console.error('Clipboard copy error:', err);
  }
}

// Modals
const showAddStoreModal = ref(false);
const showEditStoreModal = ref(false);
const selectedDetailStore = ref(null);

const newStoreForm = ref({
  code: '',
  name: '',
  city: 'Jakarta',
  totalMachines: 1,
  address: '',
  assignedStaffIds: []
});

const editStoreForm = ref({
  id: '',
  code: '',
  name: '',
  city: 'Jakarta',
  totalMachines: 1,
  address: '',
  assignedStaffIds: []
});

const DEVELOPER_ACCOUNT = {
  id: 'devsosco01',
  staffId: 'devsosco01',
  idCode: 'devsosco01',
  name: 'Developer Access',
  username: 'devsosco01',
  whatsapp: '+62 812-3456-7890',
  role: 'Super Admin',
  store: 'HQ Central',
  status: 'Active',
  isDeveloper: true,
  isProtected: true
};

const defaultStaffUsers = [DEVELOPER_ACCOUNT];

const masterStaffUsers = ref([...defaultStaffUsers]);

async function loadMasterStaff() {
  const token = localStorage.getItem('stanley_staff_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  try {
    const res = await fetch('/api/staff', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        masterStaffUsers.value = data;
        localStorage.setItem('stanley_staff_users', JSON.stringify(data));
        return;
      }
    }
  } catch (e) {}
  
  try {
    const saved = localStorage.getItem('stanley_staff_users');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        masterStaffUsers.value = parsed;
        return;
      }
    }
  } catch (e) {}
  masterStaffUsers.value = [DEVELOPER_ACCOUNT];
}

// Add Store Staff State
const addStaffSearchQuery = ref('');
const addSelectedStaffId = ref(null);
const showAddStaffDropdown = ref(false);

const assignedStaffInAdd = computed(() => {
  const ids = newStoreForm.value.assignedStaffIds || [];
  return masterStaffUsers.value.filter(u => ids.includes(u.id));
});

const filteredStaffForAdd = computed(() => {
  const assigned = newStoreForm.value.assignedStaffIds || [];
  const q = addStaffSearchQuery.value.trim().toLowerCase();
  return masterStaffUsers.value.filter(u => {
    if (assigned.includes(u.id)) return false;
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.whatsapp && u.whatsapp.toLowerCase().includes(q))
    );
  });
});

function handleSelectStaffForAdd(staffId) {
  addSelectedStaffId.value = staffId;
}

function handleAddContactToAdd() {
  if (!addSelectedStaffId.value) return;
  if (!newStoreForm.value.assignedStaffIds.includes(addSelectedStaffId.value)) {
    newStoreForm.value.assignedStaffIds.push(addSelectedStaffId.value);
  }
  addSelectedStaffId.value = null;
  addStaffSearchQuery.value = '';
  showAddStaffDropdown.value = false;
}

function handleRemoveStaffFromAdd(staffId) {
  newStoreForm.value.assignedStaffIds = (newStoreForm.value.assignedStaffIds || []).filter(id => id !== staffId);
}

// Edit Store Staff State
const editStaffSearchQuery = ref('');
const editSelectedStaffId = ref(null);
const showEditStaffDropdown = ref(false);

const assignedStaffInEdit = computed(() => {
  const ids = editStoreForm.value.assignedStaffIds || [];
  return masterStaffUsers.value.filter(u => ids.includes(u.id));
});

const filteredStaffForEdit = computed(() => {
  const assigned = editStoreForm.value.assignedStaffIds || [];
  const q = editStaffSearchQuery.value.trim().toLowerCase();
  return masterStaffUsers.value.filter(u => {
    if (assigned.includes(u.id)) return false;
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.whatsapp && u.whatsapp.toLowerCase().includes(q))
    );
  });
});

function handleSelectStaffForEdit(staffId) {
  editSelectedStaffId.value = staffId;
}

function handleAddContactToEdit() {
  if (!editSelectedStaffId.value) return;
  if (!editStoreForm.value.assignedStaffIds.includes(editSelectedStaffId.value)) {
    editStoreForm.value.assignedStaffIds.push(editSelectedStaffId.value);
  }
  editSelectedStaffId.value = null;
  editStaffSearchQuery.value = '';
  showEditStaffDropdown.value = false;
}

function handleRemoveStaffFromEdit(staffId) {
  editStoreForm.value.assignedStaffIds = (editStoreForm.value.assignedStaffIds || []).filter(id => id !== staffId);
}

const customStores = ref([]);
const storeOverrides = ref({});
const showRemoveConfirmModal = ref(false);
const storeToRemove = ref(null);

function handleRemoveStore(store) {
  if (!store) return;
  storeToRemove.value = store;
  showRemoveConfirmModal.value = true;
}

async function confirmRemoveStore() {
  if (!storeToRemove.value) return;
  const target = storeToRemove.value;
  const storeId = target.id || target.code;
  const storeName = target.name;

  const token = localStorage.getItem('stanley_staff_token');
  if (token) {
    try {
      const res = await fetch(`/api/network/stores/${encodeURIComponent(storeId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.stores && Array.isArray(data.stores)) {
          customStores.value = data.stores;
          localStorage.setItem('stanley_custom_stores', JSON.stringify(data.stores));
        }
      }
    } catch (e) {}
  }

  customStores.value = customStores.value.filter(s => s.id !== storeId && s.code !== storeId);
  localStorage.setItem('stanley_custom_stores', JSON.stringify(customStores.value));

  showRemoveConfirmModal.value = false;
  selectedDetailStore.value = null;
  storeToRemove.value = null;
  showToast(`Store "${storeName}" removed successfully.`);
}

function loadStoreOverrides() {
  try {
    const saved = localStorage.getItem('stanley_store_overrides');
    if (saved) storeOverrides.value = JSON.parse(saved);
  } catch (e) {}
}

function saveStoreOverrides() {
  try {
    localStorage.setItem('stanley_store_overrides', JSON.stringify(storeOverrides.value));
  } catch (e) {}
}

function loadCustomStores() {
  try {
    const saved = localStorage.getItem('stanley_custom_stores');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        customStores.value = parsed;
      }
    }
  } catch (e) {}
}

async function fetchNetworkStores() {
  const token = localStorage.getItem('stanley_staff_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  try {
    const res = await fetch('/api/network/stores', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        customStores.value = data;
        localStorage.setItem('stanley_custom_stores', JSON.stringify(data));
      } else if (data && Array.isArray(data.stores)) {
        customStores.value = data.stores;
        localStorage.setItem('stanley_custom_stores', JSON.stringify(data.stores));
      }
    }
  } catch (e) {
    loadCustomStores();
  }
}

let pollInterval = null;
let eventSource = null;

onMounted(() => {
  queueStore.refreshFromStorage();
  loadCustomStores();
  fetchNetworkStores();
  loadStoreOverrides();
  loadMasterStaff();

  if (typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('orders_updated', () => {
        queueStore.refreshFromStorage();
      });
      eventSource.addEventListener('stores_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (Array.isArray(data)) {
            customStores.value = data;
            localStorage.setItem('stanley_custom_stores', JSON.stringify(data));
          } else if (data && Array.isArray(data.stores)) {
            customStores.value = data.stores;
            localStorage.setItem('stanley_custom_stores', JSON.stringify(data.stores));
          }
        } catch (err) {}
      });
    } catch (e) {}
  }

  window.addEventListener('storage', handleStorageUpdate);
  window.addEventListener('stanley_orders_updated', handleStorageUpdate);

  pollInterval = setInterval(() => {
    queueStore.refreshFromStorage();
    fetchNetworkStores();
    loadMasterStaff();
  }, 2500);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  if (eventSource) eventSource.close();
  window.removeEventListener('storage', handleStorageUpdate);
  window.removeEventListener('stanley_orders_updated', handleStorageUpdate);
});

function handleStorageUpdate() {
  queueStore.refreshFromStorage();
  loadCustomStores();
  loadStoreOverrides();
  loadMasterStaff();
}

// Dynamic Real Queue from Store
const realLiveQueueCount = computed(() => {
  const orders = queueStore.orders || [];
  const valid = orders.filter(o => o && o.status !== 'cancelled');
  return valid.length;
});

const activePimMachines = computed(() => {
  const machines = queueStore.machines || [];
  return machines.filter(m => m && m.isActive !== false).length;
});

// Store Network Database List - Starts Clean Empty for Fresh Setup
const storeList = computed(() => {
  const rawList = Array.isArray(customStores.value) ? customStores.value : [];
  const overridesObj = (storeOverrides.value && typeof storeOverrides.value === 'object') ? storeOverrides.value : {};
  const ordersList = Array.isArray(queueStore.orders) ? queueStore.orders : [];

  return rawList.map(store => {
    if (!store || typeof store !== 'object') return null;
    const storeIdKey = store.id || store.code || '';
    const override = overridesObj[storeIdKey] || overridesObj[store.code] || overridesObj[store.id] || {};
    
    // Filter real orders for this store
    const storeOrders = ordersList.filter(o => 
      o && (
        (o.store_code && o.store_code === store.code) || 
        (o.store_id && o.store_id === store.id) || 
        (o.store_name && o.store_name === store.name) ||
        (store.isCurrentStation && !o.store_code)
      )
    );

    const inQueueOrders = storeOrders.filter(o => o && (o.status === 'in_queue' || o.status === 'engraving_in_progress'));
    const currentQueue = inQueueOrders.length;

    const totalMachines = override.totalMachines || store.totalMachines || store.total_machines || 1;
    const activeMachines = Math.min(store.activeMachines !== undefined ? store.activeMachines : (store.active_machines !== undefined ? store.active_machines : totalMachines), totalMachines);

    const estWaitMin = Math.round((currentQueue * 3.5) / Math.max(1, activeMachines));
    const estWaitTime = `${estWaitMin} Minutes`;

    const completedOrders = storeOrders.filter(o => o && (o.status === 'ready_for_pickup' || o.status === 'completed' || o.status === 'picked_up'));
    
    let hasAvgData = false;
    let avgDuration = '—';
    let isOnTrack = true;

    if (completedOrders.length > 0) {
      let totalSecs = 0;
      let countWithDuration = 0;
      completedOrders.forEach(o => {
        const sec = o.durationSeconds || o.engraving_duration_seconds;
        if (sec) {
          totalSecs += sec;
          countWithDuration++;
        }
      });

      if (countWithDuration > 0) {
        hasAvgData = true;
        const avgSecs = Math.round(totalSecs / countWithDuration);
        const m = Math.floor(avgSecs / 60);
        const s = avgSecs % 60;
        avgDuration = `${m}:${String(s).padStart(2, '0')}`;
        isOnTrack = avgSecs <= 240; // 4:00 min SLA
      }
    }

    return {
      ...store,
      ...override,
      code: store.code || override.code || store.id || 'STORE',
      name: store.name || override.name || 'Stanley Store',
      city: store.city || override.city || 'Jakarta',
      address: store.address || override.address || '',
      phone: store.phone || override.phone || '',
      status: store.status || override.status || 'Online',
      currentQueue,
      estWaitTime,
      hasAvgData,
      avgDuration,
      isOnTrack,
      activeMachines,
      totalMachines
    };
  }).filter(Boolean);
});

// Format Queue Numbers with 3-digit padding (e.g. 500, 010, 005)
function formatQueueCount(count) {
  return String(count).padStart(3, '0');
}

function handleSeeDetail(store) {
  selectedDetailStore.value = store;
}

function handleOpenAddStore() {
  loadMasterStaff();
  newStoreForm.value = {
    code: '',
    name: '',
    city: 'Jakarta',
    totalMachines: 1,
    address: '',
    phone: '',
    assignedStaffIds: []
  };
  addStaffSearchQuery.value = '';
  addSelectedStaffId.value = null;
  showAddStaffDropdown.value = false;
  showAddStoreModal.value = true;
}

function handleOpenEditStore(store) {
  selectedDetailStore.value = null; // Close detail modal and open edit modal

  loadMasterStaff();

  // Extract city from address if possible
  const addressParts = (store.address || '').split(',').map(s => s.trim());
  const cityGuess = addressParts.length > 1 ? addressParts[addressParts.length - 1] : 'Jakarta';

  // Get currently assigned admins for this store
  const currentAdmins = getStoreAdmins(store);

  // Guarantee all current admins are registered in masterStaffUsers
  currentAdmins.forEach(admin => {
    if (!masterStaffUsers.value.some(u => u.id === admin.id || (u.name === admin.name && u.store === store.name))) {
      masterStaffUsers.value.push({
        id: admin.id,
        staffId: store.code,
        idCode: store.code,
        name: admin.name,
        username: admin.name,
        whatsapp: admin.whatsapp || '082909012901',
        role: admin.role || 'Staff Store',
        store: store.name,
        status: 'Active'
      });
    }
  });

  editStoreForm.value = {
    id: store.id,
    code: store.code,
    name: store.name,
    city: store.city || cityGuess,
    totalMachines: store.totalMachines || 1,
    address: store.address || '',
    phone: store.phone || '',
    assignedStaffIds: currentAdmins.map(a => a.id)
  };

  editStaffSearchQuery.value = '';
  editSelectedStaffId.value = null;
  showEditStaffDropdown.value = false;
  showEditStoreModal.value = true;
}

function saveEditStore() {
  if (!editStoreForm.value.code || !editStoreForm.value.name) return;
  const storeId = editStoreForm.value.id;
  const storeName = editStoreForm.value.name;
  const storeCode = editStoreForm.value.code.toUpperCase();

  // 1. Save Store Metadata Overrides
  storeOverrides.value[storeId] = {
    code: storeCode,
    name: storeName,
    city: editStoreForm.value.city,
    totalMachines: editStoreForm.value.totalMachines,
    address: editStoreForm.value.address,
    phone: editStoreForm.value.phone
  };
  saveStoreOverrides();

  const updatedStore = {
    id: storeId,
    code: storeCode,
    name: storeName,
    city: editStoreForm.value.city || '',
    address: editStoreForm.value.address || '',
    phone: editStoreForm.value.phone || '',
    total_machines: editStoreForm.value.totalMachines || 1,
    active_machines: editStoreForm.value.totalMachines || 1,
    status: 'Online'
  };

  const token = localStorage.getItem('stanley_staff_token');
  if (token) {
    fetch('/api/network/stores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatedStore)
    }).then(res => res.json()).then(data => {
      if (data && data.stores && Array.isArray(data.stores)) {
        customStores.value = data.stores;
        localStorage.setItem('stanley_custom_stores', JSON.stringify(data.stores));
      }
    }).catch(() => {});
  }

  // 2. Sync Staff Assignments in Master Staff Accounts & Server DB
  const assignedIds = editStoreForm.value.assignedStaffIds || [];
  
  masterStaffUsers.value.forEach(u => {
    if (assignedIds.includes(u.id)) {
      u.store = storeName;
      u.staffId = storeCode;
      u.idCode = storeCode;
    } else if (u.store === storeName || (u.store && u.store.toLowerCase().trim() === storeName.toLowerCase().trim())) {
      // Unassigned from this store
      u.store = '';
      u.staffId = '';
      u.idCode = '';
    }
    
    if (token) {
      fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(u)
      }).catch(() => {});
    }
  });

  try {
    localStorage.setItem('stanley_staff_users', JSON.stringify(masterStaffUsers.value));
    window.dispatchEvent(new Event('stanley_staff_updated'));
  } catch (e) {}

  showEditStoreModal.value = false;
}

function saveNewStore() {
  if (!newStoreForm.value.code || !newStoreForm.value.name) return;
  const newStoreId = `st-custom-${Date.now()}`;
  const storeCode = newStoreForm.value.code.toUpperCase();
  const storeName = newStoreForm.value.name;

  const newStore = {
    id: newStoreId,
    code: storeCode,
    name: storeName,
    city: newStoreForm.value.city || 'Jakarta',
    address: newStoreForm.value.address || `${newStoreForm.value.city}, Indonesia`,
    phone: newStoreForm.value.phone || '',
    currentQueue: 0,
    estWaitTime: '0 Minutes',
    avgDuration: '—',
    hasAvgData: false,
    isOnTrack: true,
    activeMachines: newStoreForm.value.totalMachines,
    totalMachines: newStoreForm.value.totalMachines,
    total_machines: newStoreForm.value.totalMachines,
    active_machines: newStoreForm.value.totalMachines,
    status: 'Online',
    isCurrentStation: false
  };

  const token = localStorage.getItem('stanley_staff_token');
  if (token) {
    fetch('/api/network/stores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newStore)
    }).then(res => res.json()).then(data => {
      if (data && data.stores && Array.isArray(data.stores)) {
        customStores.value = data.stores;
        localStorage.setItem('stanley_custom_stores', JSON.stringify(data.stores));
      }
    }).catch(() => {
      customStores.value.push(newStore);
      localStorage.setItem('stanley_custom_stores', JSON.stringify(customStores.value));
    });
  } else {
    customStores.value.push(newStore);
    localStorage.setItem('stanley_custom_stores', JSON.stringify(customStores.value));
  }

  // Sync assigned staff
  const assignedIds = newStoreForm.value.assignedStaffIds || [];
  masterStaffUsers.value.forEach(u => {
    if (assignedIds.includes(u.id)) {
      u.store = storeName;
      u.staffId = storeCode;
      u.idCode = storeCode;

      if (token) {
        fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(u)
        }).catch(() => {});
      }
    }
  });

  try {
    localStorage.setItem('stanley_staff_users', JSON.stringify(masterStaffUsers.value));
    window.dispatchEvent(new Event('stanley_staff_updated'));
  } catch (e) {}

  showAddStoreModal.value = false;
  newStoreForm.value = { code: '', name: '', city: 'Jakarta', totalMachines: 1, address: '', phone: '', assignedStaffIds: [] };
}

function openStoreDashboard(store) {
  selectedDetailStore.value = null;
  const storeId = store.code || store.id || store.name;
  router.push({
    path: `/dashboard/${encodeURIComponent(storeId)}`,
    query: {
      from: 'stores',
      storeName: store.name,
      storeCode: store.code
    }
  });
}

function getInitials(name) {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getStoreAdmins(store) {
  if (!store) return [];
  const storeNameLower = (store.name || '').toLowerCase().trim();
  const storeCodeLower = (store.code || '').toLowerCase().trim();

  // 1. Match from master staff users
  const matched = masterStaffUsers.value.filter(u => {
    if (!u.store && !u.staffId && !u.idCode) return false;
    const userStore = (u.store || '').toLowerCase().trim();
    const userStaffId = (u.staffId || u.idCode || '').toLowerCase().trim();

    if (userStore && (userStore === storeNameLower || userStore.includes(storeNameLower) || storeNameLower.includes(userStore))) {
      return true;
    }
    if (userStaffId && userStaffId === storeCodeLower) {
      return true;
    }
    return false;
  });

  return matched;
}

function openWhatsApp(phone, staffName, storeName) {
  const cleanPhone = (phone || '082909012901').replace(/[^0-9]/g, '');
  const intlPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const message = encodeURIComponent(`Hi ${staffName}, contacting you regarding Stanley ${storeName} engraving operations.`);
  window.open(`https://wa.me/${intlPhone}?text=${message}`, '_blank');
}
</script>

<style scoped>
.store-list-screen {
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: #FFFFFF;
  display: flex;
  flex-direction: column;
  color: #111827;
  font-family: var(--font-brand);
  overflow-x: hidden;
}

/* Header (Matching Customer Dashboard & Engraver) */
.dashboard-header {
  height: 64px;
  padding: 0 clamp(16px, 2vw, 24px);
  background-color: #FFFFFF;
  width: 100%;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.header-inner {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-titles {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  height: 28px;
}

.stanley-logo {
  height: 24px;
  width: auto;
  object-fit: contain;
  display: block;
}

.station-heading {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
  margin: 0;
  text-transform: uppercase;
  line-height: 1;
  padding-bottom: 2px;
  display: flex;
  align-items: flex-end;
  color: #111827;
}

.header-divider {
  width: 1px;
  height: 16px;
  background-color: #D1D5DB;
  margin-bottom: 2px;
}

.store-location {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  text-transform: uppercase;
  line-height: 1;
  padding-bottom: 2px;
  display: flex;
  align-items: flex-end;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Dashboard Action Button (Matching Customer Dashboard / Engraver Outline Box Style) */
.dashboard-nav-btn {
  background-color: #FFFFFF;
  border: 1px solid #000000;
  border-radius: 8px;
  height: 40px;
  width: 148px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #000000;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.dashboard-nav-btn:hover {
  background-color: #F9FAFB;
}

.dashboard-nav-btn:active {
  transform: scale(0.99);
}

/* Main Dashboard Body (Global Padding matching Customer Dashboard) */
.dashboard-body {
  padding: clamp(16px, 2vw, 24px);
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.dashboard-content-wrap {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Page Top Bar (Figma 131:2519) */
.page-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
}

.title-meta-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #18181B;
  text-transform: uppercase;
  margin: 0;
  letter-spacing: 0.02em;
}

.page-section-subtitle {
  font-size: 12px;
  color: #71717A;
  margin: 0;
}

.top-controls-group {
  display: flex;
  align-items: center;
  gap: 12px;
}



.add-store-btn {
  height: 44px;
  padding: 0 18px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

.add-store-btn:hover {
  opacity: 0.85;
}

.plus-sign {
  font-size: 16px;
  line-height: 1;
}

/* STORES DATA TABLE CARD (Figma 111:840) */
.store-table-card {
  background: #FFFFFF;
  border: 1px solid #E4E4E7;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.table-responsive-wrapper {
  width: 100%;
  overflow-x: auto;
}

.store-data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

/* Headers */
.table-header-row {
  background-color: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
  height: 56px;
}

.th-cell {
  padding: 0 20px;
  font-size: 12px;
  font-weight: 700;
  color: #111827;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* Data Rows */
.table-data-row {
  height: 64px;
  border-bottom: 1px solid #F3F4F6;
  transition: background-color 0.1s ease;
}

.table-data-row:last-child {
  border-bottom: none;
}

.table-data-row:hover {
  background-color: #FBFBFC;
}

.table-empty-row {
  height: 280px;
}

.td-empty-state {
  text-align: center;
  padding: 48px 24px !important;
}

.empty-store-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.empty-store-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #F4F4F5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #71717A;
  margin-bottom: 4px;
}

.empty-store-title {
  font-size: 16px;
  font-weight: 600;
  color: #18181B;
  margin: 0;
}

.empty-store-desc {
  font-size: 13px;
  color: #71717A;
  margin: 0;
  max-width: 360px;
  line-height: 1.5;
}

.empty-add-store-btn {
  margin-top: 8px;
  height: 38px;
  padding: 0 18px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.empty-add-store-btn:hover {
  opacity: 0.85;
}

.td-cell {
  padding: 0 20px;
  font-size: 13px;
  color: #111827;
  vertical-align: middle;
}

.store-id-text {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
}

.store-name-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.store-name-text {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.queue-num-text {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.wait-time-text {
  font-size: 13px;
  color: #374151;
}

/* AVG Duration Column with SLA tag (Figma 97:583 & 97:606) */
.avg-duration-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.duration-val-text {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.duration-val-text.text-over-sla {
  color: #EF4444;
}

.sla-track-indicator {
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.sla-track-indicator.on-track {
  color: #00C950;
}

.sla-track-indicator.over-sla {
  color: #EF4444;
}

.machine-active-text {
  font-size: 13px;
  color: #4B5563;
}

.machine-bold {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.store-status-text {
  font-size: 13px;
  font-weight: 700;
}

.store-status-text.is-online {
  color: #111827;
}

.store-status-text.is-offline {
  color: #9CA3AF;
}

/* Action: Store Actions & Buttons Group */
.store-actions-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
  background: #FFFFFF;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}

.action-icon-btn:hover {
  background: #F3F4F6;
  border-color: #D1D5DB;
  color: #111827;
}

.action-icon-btn.btn-delete-store:hover {
  background: #FEE2E2;
  border-color: #FCA5A5;
}

.see-detail-btn {
  height: 34px;
  padding: 0 14px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

.see-detail-btn:hover {
  opacity: 0.85;
}

/* Floating Toast Notification */
.toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #111827;
  color: #FFFFFF;
  padding: 12px 18px;
  border-radius: 10px;
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  z-index: 9999;
}

.toast-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #10B981;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Modals */
.modal-backdrop,
.date-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.product-modal-card {
  background: #FFFFFF;
  border-radius: 16px;
  width: 100%;
  max-width: min(94vw, 680px);
  max-height: min(92vh, 92dvh);
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.modal-title-bold {
  font-size: clamp(15px, 1.3vw, 17px);
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.modal-close-icon-btn {
  background: transparent;
  border: none;
  font-size: 20px;
  color: #9CA3AF;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  border-radius: 6px;
  transition: color 0.15s ease;
}

.modal-close-icon-btn:hover {
  color: #111827;
}

.modal-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: clamp(16px, 2vw, 22px) clamp(18px, 2.4vw, 24px);
  border-bottom: 1px solid #E5E7EB;
  background: #FFFFFF;
  flex-shrink: 0;
}

/* Store Info Modal (Figma 403:483) */
.store-info-modal-card {
  background: #FFFFFF;
  border-radius: 16px;
  width: 100%;
  max-width: min(94vw, 680px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

.store-info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.store-info-header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.store-info-badges-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.store-info-code-badge {
  background: #F3F4F6;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #000000;
  letter-spacing: 0.02em;
}

.store-info-status-badge {
  background: #DCFCE7;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #22C55E;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.store-info-status-badge.is-offline {
  background: #F3F4F6;
  color: #6B7280;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #22C55E;
}

.store-info-status-badge.is-offline .status-dot {
  background-color: #9CA3AF;
}

.store-info-title {
  font-size: 20px;
  font-weight: 700;
  color: #000000;
  margin: 0;
  line-height: 1.2;
}

.store-info-address {
  font-size: 12px;
  font-weight: 400;
  color: #4B5563;
  margin: 0;
}

.store-info-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.store-info-trash-btn {
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #9CA3AF;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s ease;
}

.store-info-trash-btn:hover {
  color: #DC2626;
  background: #FEF2F2;
}

.store-info-close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #9CA3AF;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  transition: color 0.15s ease;
}

.store-info-close-btn:hover {
  color: #000000;
}

.store-info-divider {
  height: 1px;
  background-color: #E5E7EB;
  width: 100%;
  margin: 20px 0;
}

.store-info-admins-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.admins-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.admins-title {
  font-size: 13px;
  font-weight: 700;
  color: #000000;
  margin: 0;
}

.admins-assigned-pill {
  background: #F3F4F6;
  padding: 3px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  color: #4B5563;
}

.admins-list-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.admin-card-row {
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  box-sizing: border-box;
  background: #FFFFFF;
}

.admin-card-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-circle-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #000000;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.admin-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-name-role-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-full-name {
  font-size: 14px;
  font-weight: 700;
  color: #000000;
}

.admin-role-tag {
  background: #F3F4F6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #4B5563;
}

.admin-code-phone-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.admin-code-text {
  font-weight: 700;
  color: #4B5563;
}

.admin-phone-text {
  color: #9CA3AF;
  font-weight: 400;
}

.btn-contact-admin-black {
  background: #000000;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

.btn-contact-admin-black:hover {
  opacity: 0.85;
}

.store-info-bottom-actions {
  border-top: 1px solid #E5E7EB;
  padding-top: 24px;
  margin-top: 20px;
  display: flex;
  gap: 12px;
  width: 100%;
}

.btn-edit-store-info {
  flex: 1;
  height: 48px;
  border: 1px solid #000000;
  background: #FFFFFF;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-edit-store-info:hover {
  background-color: #F4F4F5;
}

.btn-store-dashboard-black {
  flex: 1;
  height: 48px;
  border: none;
  background: #000000;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #FFFFFF;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-store-dashboard-black:hover {
  opacity: 0.85;
}

.modal-form-content {
  padding: clamp(16px, 2vw, 24px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.8vw, 20px);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.modal-form-content::-webkit-scrollbar {
  width: 6px;
}
.modal-form-content::-webkit-scrollbar-thumb {
  background: #D1D5DB;
  border-radius: 4px;
}
.modal-form-content::-webkit-scrollbar-track {
  background: #F3F4F6;
}

.two-images-upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.product-name-input-block {
  width: 100%;
  padding-top: 2px;
}

.param-col-title {
  font-size: clamp(12.5px, 1.05vw, 14px);
  font-weight: 700;
  color: #000000;
  margin: 0;
  line-height: 1.2;
}

.product-name-underline-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #000000;
  padding: 10px 0;
  font-size: clamp(13px, 1.1vw, 14px);
  color: #000000;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  background: transparent;
}

.product-name-underline-input::placeholder {
  color: #ABABAB;
}

.product-name-underline-input:focus {
  border-bottom-width: 1.5px;
}

.machine-picker-pills-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.option-pill {
  height: 38px;
  padding: 0 clamp(10px, 1vw, 14px);
  border: 1px solid #000000;
  border-radius: 8px;
  font-size: clamp(11.5px, 1vw, 13px);
  font-weight: 600;
  background: #FFFFFF;
  color: #000000;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.option-pill.is-selected {
  background: #000000;
  color: #FFFFFF;
}

.modal-bottom-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding-top: 12px;
  flex-shrink: 0;
}

.btn-figma-cancel {
  flex: 1;
  height: clamp(42px, 5vh, 48px);
  border: 1px solid #000000;
  background: #FFFFFF;
  border-radius: 8px;
  font-size: clamp(13px, 1.1vw, 14px);
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-figma-cancel:hover {
  background-color: #F4F4F5;
}

.btn-figma-save {
  flex: 1;
  height: clamp(42px, 5vh, 48px);
  border: none;
  background: #000000;
  border-radius: 8px;
  font-size: clamp(13px, 1.1vw, 14px);
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-figma-save:hover {
  opacity: 0.85;
}

@media (max-width: 580px) {
  .two-images-upload-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Store Admins & Operators Management (Figma 403:500 / 411:603) */
.edit-store-admins-block {
  padding-top: 6px;
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.edit-admins-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-search-action-row {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.admin-search-input-wrap {
  flex: 1;
  height: 42px;
  background: #F5F5F5;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
}

.admin-search-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.admin-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #111827;
  outline: none;
  font-family: inherit;
}

.admin-search-input::placeholder {
  color: rgba(0, 0, 0, 0.28);
}

.btn-add-contact-black {
  height: 42px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

.btn-add-contact-black:hover:not(:disabled) {
  opacity: 0.85;
}

.btn-add-contact-black:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Staff Search Dropdown (Figma 411:844) */
.staff-dropdown-container {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.08);
  max-height: 220px;
  overflow-y: auto;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.staff-dropdown-item {
  padding: 10px 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #E5E7EB;
}

.staff-dropdown-item:last-child {
  border-bottom: none;
}

.staff-dropdown-item:hover {
  background-color: #F9FAFB;
}

.staff-dropdown-item.is-selected {
  background-color: #F3F4F6;
}

.staff-radio-icon {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-circle-active {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #FFFFFF;
}

.radio-circle-inactive {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid #D1D5DB;
  background: #FFFFFF;
}

.staff-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.staff-item-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.staff-item-role {
  font-size: 12px;
  color: #4B5563;
}

.staff-item-phone {
  font-size: 12px;
  color: #9CA3AF;
}

/* Assigned Admins List Rows (Figma 411:608) */
.assigned-admins-list-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 4px;
}

.assigned-admin-row-card {
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF;
}

.admin-card-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 100px;
  background: #000000;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.admin-card-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-name-role-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-name-bold {
  font-size: 14px;
  font-weight: 700;
  color: #000000;
}

.admin-role-badge {
  background: #F3F4F6;
  color: #4B5563;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.admin-phone-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.admin-code-bold {
  font-weight: 700;
  color: #4B5563;
}

.admin-phone-gray {
  font-weight: 400;
  color: #9CA3AF;
}

.btn-admin-trash-box {
  width: 38px;
  height: 38px;
  border: 1px solid #000000;
  border-radius: 8px;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-admin-trash-box:hover {
  background-color: #FEF2F2;
  border-color: #EF4444;
}

.modal-footer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: clamp(14px, 1.8vw, 20px) clamp(18px, 2.4vw, 24px);
  border-top: 1px solid #E5E7EB;
  background: #FFFFFF;
  flex-shrink: 0;
  margin: 0;
}

.btn-secondary {
  height: 44px;
  padding: 0 clamp(16px, 1.5vw, 22px);
  background: #FFFFFF;
  border: 1px solid #000000;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-secondary:hover {
  background-color: #F4F4F5;
}

.btn-primary-black {
  height: 44px;
  padding: 0 clamp(20px, 2vw, 28px);
  background: #000000;
  color: #FFFFFF;
  border: 1px solid #000000;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.btn-primary-black:hover {
  background-color: #1F2937;
  border-color: #1F2937;
}

.fade-in {
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
</style>
