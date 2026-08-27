<template>
  <div class="settings-screen">
    
    <!-- TOP GLOBAL HEADER (Matching Customer Dashboard & Admin Standard) -->
    <header class="dashboard-header">
      <div class="header-inner">
        <!-- Left: Stanley Bear Logo & Title -->
        <div class="header-titles">
          <img 
            :src="logoBlack" 
            alt="Stanley 1913" 
            class="stanley-logo" 
          />
          <h1 class="station-heading">SETTINGS</h1>
          <div class="header-divider"></div>
          <p class="store-location">SYSTEM CONFIGURATION</p>
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

        <!-- Page Section Heading (Figma 362:1165) -->
        <div class="settings-header-block">
          <h2 class="settings-title">SETTINGS</h2>
          <p class="settings-subtitle">Configure the customer registration form and manage staff accounts.</p>
        </div>

        <!-- Tabs and Search / Action Controls (Figma 362:1170) -->
        <div class="tabs-and-controls-bar">
          
          <!-- Segmented Menu Toggle (Product vs User) -->
          <div class="segmented-tab-container">
            <button 
              type="button" 
              class="tab-btn"
              :class="{ 'is-active': activeTab === 'product' }"
              @click="activeTab = 'product'"
            >
              Product
            </button>
            <button 
              type="button" 
              class="tab-btn"
              :class="{ 'is-active': activeTab === 'user' }"
              @click="activeTab = 'user'"
            >
              User
            </button>
          </div>

          <!-- Search and CTA Button -->
          <div class="search-and-cta-group">
            <div class="search-box-wrap">
              <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                v-model="searchQuery"
                type="text" 
                class="search-input" 
                :placeholder="activeTab === 'product' ? 'Search product name, model...' : 'Search Name, Username, ID'"
              />
              <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
            </div>

            <button 
              v-if="activeTab === 'product'"
              type="button" 
              class="cta-black-btn"
              @click="openAddProductModal"
              title="Add a new Stanley cup product to customer PWA"
            >
              <span class="plus-icon">+</span>
              <span>Add New Product</span>
            </button>

            <button 
              v-else
              type="button" 
              class="cta-black-btn"
              @click="openAddStaffModal"
              title="Add a new store staff or engraver account"
            >
              <span class="plus-icon">+</span>
              <span>Add New Staff</span>
            </button>
          </div>

        </div>

        <!-- ============================================== -->
        <!-- TAB 1: PRODUCT SETTINGS (Figma 362:1164)        -->
        <!-- ============================================== -->
        <div v-if="activeTab === 'product'" class="product-tab-section">
          
          <!-- Drag to Reorder Informational Banner (Figma 362:2264) -->
          <div v-if="showDragBanner" class="drag-reorder-banner fade-in">
            <div class="banner-left-content">
              <div class="drag-dots-icon">
                <span class="dot-row"><span class="dot"></span><span class="dot"></span></span>
                <span class="dot-row"><span class="dot"></span><span class="dot"></span></span>
                <span class="dot-row"><span class="dot"></span><span class="dot"></span></span>
              </div>
              <p class="banner-desc">Drag and drop the product cards to change the display order on the customer registration page.</p>
            </div>
            <button 
              type="button" 
              class="banner-close-btn"
              @click="showDragBanner = false"
              title="Dismiss banner"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <!-- Product Empty State when No Products Exist -->
          <div v-if="filteredProducts.length === 0" class="empty-settings-card">
            <div class="empty-settings-container">
              <div class="empty-settings-icon-wrap">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
              <h3 class="empty-settings-title">No Products Added Yet</h3>
              <p class="empty-settings-desc">Add your Stanley cup models to make them available for customer engraving customization.</p>
              <button 
                type="button" 
                class="empty-settings-add-btn" 
                @click="openAddProductModal"
              >
                + Add New Product
              </button>
            </div>
          </div>

          <!-- Product Cards 3-Column Grid (Figma 362:2125) -->
          <div 
            v-else
            class="product-cards-grid"
            @dragover.prevent
            @dragenter.prevent
          >
            <div 
              v-for="(product, index) in filteredProducts" 
              :key="product.id"
              :data-index="index"
              class="product-config-card"
              :class="{ 
                'is-inactive-card': !product.isActive,
                'is-dragging': draggedIndex === index,
                'is-touch-target': touchOverIndex === index && draggedIndex !== index
              }"
              draggable="true"
              @dragstart="handleDragStart(index, $event)"
              @dragover.prevent="handleDragOver(index, $event)"
              @drop="handleDrop(index, $event)"
              @dragend="handleDragEnd"
              @touchstart.passive="handleTouchStart(index, $event)"
              @touchmove="handleTouchMove($event)"
              @touchend="handleTouchEnd($event)"
            >
              <!-- Card Top Left: Order Badge + Drag Grip (Figma 362:2127) -->
              <div class="card-left-affordance">
                <div class="order-badge">
                  {{ index + 1 }}
                </div>
                
                <div class="card-drag-handle" title="Drag and drop card to reorder">
                  <span class="dot-row"><span class="dot"></span><span class="dot"></span></span>
                  <span class="dot-row"><span class="dot"></span><span class="dot"></span></span>
                  <span class="dot-row"><span class="dot"></span><span class="dot"></span></span>
                </div>
              </div>

              <!-- Product Image Thumbnail -->
              <div class="product-thumb-box">
                <img :src="product.image" :alt="product.name" class="product-preview-img" />
              </div>

              <!-- Card Details & Parameters -->
              <div class="card-meta-details">
                
                <!-- Title & Status Row -->
                <div class="product-title-row">
                  <h3 class="product-name-heading">{{ product.name }}</h3>
                  <span 
                    class="product-status-pill"
                    :class="{ 'status-active': product.isActive, 'status-inactive': !product.isActive }"
                  >
                    ● {{ product.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>

                <!-- Specs: Available Sizes & Orientations -->
                <div class="specs-tags-group">
                  
                  <!-- Size Options -->
                  <div class="tags-row">
                    <span 
                      v-for="size in (product.availableSizes || [])" 
                      :key="size" 
                      class="spec-tag-pill"
                    >
                      {{ size }}
                    </span>
                  </div>

                  <!-- Orientation Options -->
                  <div class="tags-row">
                    <span 
                      v-for="pos in (product.availablePositions || [])" 
                      :key="pos" 
                      class="spec-tag-pill"
                    >
                      {{ pos }}
                    </span>
                  </div>

                </div>

                <!-- Action Buttons: Edit & Delete -->
                <div class="card-bottom-actions">
                  <button 
                    type="button" 
                    class="card-edit-btn"
                    @click="openEditProductModal(product)"
                  >
                    Edit
                  </button>
                  
                  <button 
                    type="button" 
                    class="card-delete-btn"
                    @click.stop="deleteProduct(product, index)"
                    :title="`Delete ${product.name}`"
                  >
                    <svg class="action-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>

              </div>

            </div>
          </div>

        </div>

        <!-- ============================================== -->
        <!-- TAB 2: USER / STAFF SETTINGS                   -->
        <!-- ============================================== -->
        <div v-else class="user-tab-section">
          <div class="user-table-card">
            <table class="user-data-table">
              <thead>
                <tr class="user-th-row">
                  <th class="user-th col-staff-id">Staff ID</th>
                  <th class="user-th col-name">Name</th>
                  <th class="user-th col-username">Username</th>
                  <th class="user-th col-whatsapp">WhatsApp</th>
                  <th class="user-th col-role">Role</th>
                  <th class="user-th col-store">Store</th>
                  <th class="user-th col-status">Status</th>
                  <th class="user-th col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                <!-- Staff Empty State Row when No Staff Users Exist -->
                <tr v-if="filteredStaffUsers.length === 0" class="table-empty-row">
                  <td colspan="8" class="td-cell td-empty-state">
                    <div class="empty-settings-container">
                      <div class="empty-settings-icon-wrap">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <h3 class="empty-settings-title">No Staff Users Registered Yet</h3>
                      <p class="empty-settings-desc">Register store operators and supervisors to assign them to retail store stations.</p>
                      <button 
                        type="button" 
                        class="empty-settings-add-btn" 
                        @click="openAddStaffModal"
                      >
                        + Add New Staff
                      </button>
                    </div>
                  </td>
                </tr>

                <tr 
                  v-for="user in filteredStaffUsers" 
                  :key="user.id || user.username || user.staffId" 
                  class="user-tr"
                  :class="{ 'developer-row': user.isDeveloper || user.username === 'devsosco01' }"
                >
                  <td class="user-td col-staff-id">
                    <span class="staff-id-text" :class="{ 'dev-id-text': user.isDeveloper || user.username === 'devsosco01' }">
                      {{ user.staffId || user.idCode || '-' }}
                    </span>
                  </td>
                  <td class="user-td col-name">
                    <div class="user-name-cell">
                      <span class="user-name-text">{{ user.name || '-' }}</span>
                      <span v-if="user.isDeveloper || user.username === 'devsosco01'" class="dev-badge-pill">Master Developer</span>
                    </div>
                  </td>
                  <td class="user-td col-username">{{ user.username || user.name || '-' }}</td>
                  <td class="user-td col-whatsapp">{{ user.whatsapp || '-' }}</td>
                  <td class="user-td col-role">
                    <span class="user-role-badge" :class="{ 'role-super-admin': user.role === 'Super Admin' }">
                      {{ user.role || 'Staff Store' }}
                    </span>
                  </td>
                  <td class="user-td col-store">{{ user.store || '-' }}</td>
                  <td class="user-td col-status">
                    <span class="user-status-text" :class="{ 'is-inactive': user.status === 'Inactive' }">
                      {{ user.status || 'Active' }}
                    </span>
                  </td>
                  <td class="user-td col-action">
                    <!-- Protected Developer Account: No Edit / Delete Action Menu -->
                    <div 
                      v-if="user.isDeveloper || user.username === 'devsosco01' || user.staffId === 'devsosco01'" 
                      class="developer-protected-badge" 
                      title="Master Developer Account (Protected - Cannot be edited or deleted)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>Protected</span>
                    </div>

                    <!-- Regular Staff Accounts: Edit & Delete Action Menu -->
                    <div v-else class="user-actions-cell">
                      <button 
                        type="button" 
                        class="btn-user-icon-edit" 
                        @click="openEditStaffModal(user)" 
                        title="Edit User"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button 
                        type="button" 
                        class="btn-user-icon-delete" 
                        @click="deleteStaff(user)" 
                        title="Delete User"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
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

    <!-- ADD / EDIT PRODUCT MODAL (FIGMA NODE 350:353) -->
    <Teleport to="body">
      <div v-if="showProductModal" class="modal-backdrop" @click="closeProductModal">
        <div class="product-modal-card fade-in" @click.stop>
          
          <!-- Modal Header (Figma 350:421) -->
          <div class="modal-header-row">
            <h3 class="modal-title-bold">{{ isEditMode ? 'Edit Product' : 'Add New Product' }}</h3>
            <button type="button" class="modal-close-icon-btn" @click="closeProductModal" aria-label="Close">
              ✕
            </button>
          </div>

          <form @submit.prevent="saveProductForm" class="modal-form-content">
            
            <!-- 2 Image Upload Boxes: Product Image (Step 1) & Product Engraved (Step 2) (Figma 351:441) -->
            <div class="two-images-upload-grid">
              
              <!-- Box 1: Product Image (Step 1 Thumbnail) -->
              <div class="image-upload-column">
                <label class="image-box-heading">Product Image</label>
                <div 
                  class="upload-dropzone-box" 
                  :class="{ 'has-image': !!productForm.image }"
                  @click="triggerProductImageUpload"
                  @dragover.prevent
                  @drop.prevent="handleProductImageDrop"
                >
                  <input 
                    ref="productImageInputRef" 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    class="hidden-file-input" 
                    @change="onProductImageFileSelected" 
                  />

                  <template v-if="productForm.image">
                    <img :src="productForm.image" alt="Product Thumbnail" class="uploaded-preview-img" />
                    <div class="upload-overlay-actions" @click.stop>
                      <button type="button" class="btn-overlay-action" @click="triggerProductImageUpload">Change</button>
                      <button type="button" class="btn-overlay-action btn-remove" @click="productForm.image = ''">Remove</button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="upload-icon-circle">
                      <svg class="upload-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                    <span class="upload-prompt-text">Click to upload image</span>
                    <span class="upload-format-hint">PNG, JPG up to 5MB</span>
                  </template>
                </div>
              </div>

              <!-- Box 2: Product Engraved (Step 2 Engraving Space) -->
              <div class="image-upload-column">
                <label class="image-box-heading">Product Engraved</label>
                <div 
                  class="upload-dropzone-box" 
                  :class="{ 'has-image': !!productForm.engravedImage }"
                  @click="triggerEngravedImageUpload"
                  @dragover.prevent
                  @drop.prevent="handleEngravedImageDrop"
                >
                  <input 
                    ref="engravedImageInputRef" 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    class="hidden-file-input" 
                    @change="onEngravedImageFileSelected" 
                  />

                  <template v-if="productForm.engravedImage">
                    <img :src="productForm.engravedImage" alt="Product Engraved Space" class="uploaded-preview-img" />
                    <div class="upload-overlay-actions" @click.stop>
                      <button type="button" class="btn-overlay-action" @click="triggerEngravedImageUpload">Change</button>
                      <button type="button" class="btn-overlay-action btn-remove" @click="productForm.engravedImage = ''">Remove</button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="upload-icon-circle">
                      <svg class="upload-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                    <span class="upload-prompt-text">Click to upload image</span>
                    <span class="upload-format-hint">PNG, JPG up to 5MB</span>
                  </template>
                </div>
              </div>

            </div>

            <!-- Product Name Underline Input (Figma 350:397) -->
            <div class="product-name-input-block">
              <input 
                v-model="productForm.name" 
                type="text" 
                class="product-name-underline-input" 
                placeholder="Product Name" 
                required 
              />
            </div>

            <!-- Parameters 3-Column Configuration Row (Figma 350:401 & 377:2346) -->
            <div class="params-three-col-row">
              
              <!-- Available Size -->
              <div class="param-column">
                <label class="param-col-title">Available Size</label>
                <div class="param-pills-wrap">
                  <!-- Size Preset Pills -->
                  <div 
                    v-for="sizeOpt in ALL_SIZE_OPTIONS" 
                    :key="sizeOpt"
                    class="preset-pill-item"
                  >
                    <button 
                      type="button" 
                      class="figma-option-pill"
                      :class="{ 
                        'is-selected': (productForm.availableSizes || []).includes(sizeOpt),
                        'is-editing-mode': isEditingSizes
                      }"
                      @click="isEditingSizes ? deleteSizePreset(sizeOpt) : toggleSizeOption(sizeOpt)"
                    >
                      {{ sizeOpt }}
                      <!-- Removable icon on every preset in edit mode -->
                      <span 
                        v-if="isEditingSizes" 
                        class="pill-remove-btn"
                        title="Delete preset"
                        @click.stop="deleteSizePreset(sizeOpt)"
                      >
                        ✕
                      </span>
                    </button>
                  </div>

                  <!-- Add Button / Input (Visible when in Edit Mode) -->
                  <template v-if="isEditingSizes">
                    <div v-if="showCustomSizeInput" class="custom-size-input-wrapper">
                      <input 
                        ref="customSizeInputRef"
                        v-model="customSizeValue" 
                        type="text" 
                        class="custom-size-input" 
                        placeholder="e.g. 64"
                        maxlength="10"
                        @keydown.enter.prevent="submitCustomSize"
                        @keydown.esc="cancelCustomSize"
                      />
                      <button type="button" class="btn-custom-size-add" @click="submitCustomSize">Add</button>
                      <button type="button" class="btn-custom-size-cancel" @click="cancelCustomSize">✕</button>
                    </div>
                    <button 
                      v-else
                      type="button" 
                      class="figma-option-pill btn-add-custom-size"
                      @click="openCustomSizeInput"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add
                    </button>
                  </template>

                  <!-- Edit / Done Button in the last order -->
                  <button 
                    type="button" 
                    class="figma-option-pill btn-edit-presets"
                    :class="{ 'is-done-active': isEditingSizes }"
                    @click="toggleEditSizesMode"
                  >
                    <template v-if="!isEditingSizes">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit
                    </template>
                    <template v-else>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Done
                    </template>
                  </button>
                </div>
              </div>

              <!-- Orientation -->
              <div class="param-column">
                <label class="param-col-title">Orientation</label>
                <div class="param-pills-wrap">
                  <button 
                    v-for="posOpt in ALL_POSITION_OPTIONS" 
                    :key="posOpt"
                    type="button" 
                    class="figma-option-pill"
                    :class="{ 'is-selected': (productForm.availablePositions || []).includes(posOpt) }"
                    @click="togglePositionOption(posOpt)"
                  >
                    {{ posOpt }}
                  </button>
                </div>
              </div>

              <!-- Appear in app -->
              <div class="param-column">
                <label class="param-col-title">Appear in app</label>
                <div class="segmented-status-container">
                  <button 
                    type="button" 
                    class="status-segment-btn"
                    :class="{ 'is-active': productForm.isActive }"
                    @click="productForm.isActive = true"
                  >
                    Active
                  </button>
                  <button 
                    type="button" 
                    class="status-segment-btn"
                    :class="{ 'is-active': !productForm.isActive }"
                    @click="productForm.isActive = false"
                  >
                    Inactive
                  </button>
                </div>
              </div>

            </div>

            <!-- Modal Bottom Actions (Figma 350:369) -->
            <div class="modal-bottom-actions-row">
              <button 
                type="button" 
                class="btn-figma-cancel"
                @click="closeProductModal"
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

    <!-- ADD / EDIT STAFF MODAL -->
    <Teleport to="body">
      <div v-if="showStaffModal" class="modal-backdrop" @click="closeStaffModal">
        <div class="product-modal-card fade-in" @click.stop>
          
          <div class="modal-header-row">
            <h3 class="modal-title-bold">{{ isEditStaffMode ? 'Edit Staff User' : 'Add New Staff' }}</h3>
            <button type="button" class="modal-close-icon-btn" @click="closeStaffModal" aria-label="Close">
              ✕
            </button>
          </div>

          <form @submit.prevent="saveStaffForm" class="modal-form-content" autocomplete="off">
            
            <div class="two-images-upload-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">Staff ID*</label>
                <input 
                  v-model="staffForm.staffId" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. EG-021" 
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  required 
                />
              </div>
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">Full Name*</label>
                <input 
                  v-model="staffForm.name" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. Ayu Dewi" 
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  required 
                />
              </div>
            </div>

            <div class="two-images-upload-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">Store Location*</label>
                <div class="select-dropdown-wrapper">
                  <select 
                    v-model="staffForm.store" 
                    class="product-name-underline-select"
                    required
                  >
                    <option value="" disabled>Select Store Location</option>
                    <option v-for="loc in AVAILABLE_STORE_LOCATIONS" :key="loc" :value="loc">
                      {{ loc }}
                    </option>
                  </select>
                  <svg class="select-chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 4px;">WhatsApp Number*</label>
                <input 
                  v-model="staffForm.whatsapp" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. 082909012901" 
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  required 
                />
              </div>
            </div>

            <!-- Security Login PIN Input Row -->
            <div class="product-name-input-block" style="margin-top: 2px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="param-col-title" style="margin: 0;">Security Login PIN{{ isEditStaffMode ? '' : '*' }}</label>
                <span style="font-size: 11px; color: #71717A; font-weight: 500;">{{ isEditStaffMode ? 'Leave blank to keep current PIN' : '4–6 digit PIN for staff login' }}</span>
              </div>
              <div style="position: relative; display: flex; align-items: center;">
                <input
                  v-model="staffForm.pin"
                  :type="showStaffPin ? 'text' : 'password'"
                  class="product-name-underline-input"
                  :placeholder="isEditStaffMode ? 'Leave blank to keep current PIN' : 'e.g. 1913'"
                  maxlength="6"
                  autocomplete="new-password"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  :required="!isEditStaffMode"
                  style="padding-right: 48px; letter-spacing: 2px; font-weight: 600;"
                />
                <button 
                  type="button" 
                  @click="showStaffPin = !showStaffPin" 
                  style="position: absolute; right: 0; background: none; border: none; cursor: pointer; color: #52525B; font-size: 11.5px; font-weight: 600; padding: 4px 6px;"
                  :title="showStaffPin ? 'Hide PIN' : 'Show PIN'"
                >
                  {{ showStaffPin ? 'HIDE' : 'SHOW' }}
                </button>
              </div>
            </div>

            <!-- Parameters 2-Column Configuration Row (Role & Status) -->
            <div class="params-three-col-row" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
              
              <!-- Role -->
              <div class="param-column">
                <label class="param-col-title">Role</label>
                <div class="param-pills-wrap">
                  <button 
                    v-for="roleOpt in ['Staff Store', 'Supervisor', 'Super Admin']" 
                    :key="roleOpt"
                    type="button" 
                    class="figma-option-pill"
                    :class="{ 'is-selected': staffForm.role === roleOpt }"
                    @click="staffForm.role = roleOpt"
                  >
                    {{ roleOpt }}
                  </button>
                </div>
              </div>

              <!-- Status -->
              <div class="param-column">
                <label class="param-col-title">Status</label>
                <div class="segmented-status-container">
                  <button 
                    type="button" 
                    class="status-segment-btn"
                    :class="{ 'is-active': staffForm.status === 'Active' }"
                    @click="staffForm.status = 'Active'"
                  >
                    Active
                  </button>
                  <button 
                    type="button" 
                    class="status-segment-btn"
                    :class="{ 'is-active': staffForm.status === 'Inactive' }"
                    @click="staffForm.status = 'Inactive'"
                  >
                    Inactive
                  </button>
                </div>
              </div>

            </div>

            <div class="modal-bottom-actions-row">
              <button 
                type="button" 
                class="btn-figma-cancel"
                @click="closeStaffModal"
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

  </div>
</template>

<script setup>
import logoBlack from '../assets/images/logo-black.png';
import productStep1 from '../assets/images/product-step1.png';
import productStep2 from '../assets/images/product-step2.png';
import productIceflow from '../assets/images/product-iceflow-fastflow.png';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Active Navigation Tab: 'product' (default) or 'user'
const activeTab = ref('product');
const searchQuery = ref('');

// Constants for available options (12oz, 14oz, 16oz, 20oz, 24oz, 30oz, 36oz, 40oz, 48oz + Custom)
const DEFAULT_SIZE_PRESETS = ['12 Oz', '14 Oz', '16 Oz', '20 Oz', '24 Oz', '30 Oz', '36 Oz', '40 Oz', '48 Oz'];

function sortOzSizes(sizesArray) {
  if (!Array.isArray(sizesArray)) return [];
  return [...sizesArray].sort((a, b) => {
    const numA = parseFloat(String(a).match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
    const numB = parseFloat(String(b).match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
    if (numA !== numB) return numA - numB;
    return String(a).localeCompare(String(b));
  });
}

const sizePresets = ref(sortOzSizes([...DEFAULT_SIZE_PRESETS]));
const isEditingSizes = ref(false);

async function loadSizePresets() {
  const token = localStorage.getItem('stanley_staff_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  try {
    const res = await fetch('/api/settings/size_presets', { headers });
    if (res.ok) {
      const data = await res.json();
      const val = data && data.value !== undefined ? data.value : data;
      if (Array.isArray(val) && val.length > 0) {
        sizePresets.value = sortOzSizes(val);
        localStorage.setItem('stanley_size_presets', JSON.stringify(sizePresets.value));
        return;
      }
    }
  } catch (e) {}

  try {
    const saved = localStorage.getItem('stanley_size_presets');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        sizePresets.value = sortOzSizes(parsed);
        return;
      }
    }
  } catch (e) {}
  sizePresets.value = sortOzSizes([...DEFAULT_SIZE_PRESETS]);
}

async function persistSizePresets() {
  sizePresets.value = sortOzSizes(sizePresets.value);
  try {
    localStorage.setItem('stanley_size_presets', JSON.stringify(sizePresets.value));
    window.dispatchEvent(new Event('stanley_size_presets_updated'));
  } catch (e) {}

  const token = localStorage.getItem('stanley_staff_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    await fetch('/api/settings/size_presets', {
      method: 'POST',
      headers,
      body: JSON.stringify({ value: sizePresets.value })
    });
  } catch (e) {
    console.warn('Failed to sync size presets to server:', e);
  }
}

const ALL_SIZE_OPTIONS = computed(() => {
  const presets = Array.isArray(sizePresets.value) && sizePresets.value.length > 0
    ? sizePresets.value
    : DEFAULT_SIZE_PRESETS;
  const fromForm = Array.isArray(productForm.value.availableSizes) ? productForm.value.availableSizes : [];
  return sortOzSizes([...new Set([...presets, ...fromForm])]);
});

const ALL_POSITION_OPTIONS = ['Vertical', 'Horizontal'];
const storeLocationsList = ref([]);

const AVAILABLE_STORE_LOCATIONS = computed(() => {
  if (storeLocationsList.value.length > 0) {
    return storeLocationsList.value;
  }
  try {
    const custom = localStorage.getItem('stanley_custom_stores');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => s && s.name).filter(Boolean);
      }
    }
  } catch (e) {}
  return [];
});

async function loadStoreLocations() {
  const token = localStorage.getItem('stanley_staff_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  try {
    const res = await fetch('/api/network/stores', { headers });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.stores) ? data.stores : []);
      if (list.length > 0) {
        storeLocationsList.value = list.map(s => s && s.name).filter(Boolean);
        localStorage.setItem('stanley_custom_stores', JSON.stringify(list));
      }
    }
  } catch (e) {}
}

// Modals State
const showProductModal = ref(false);
const isEditMode = ref(false);
const showStaffModal = ref(false);
const isEditStaffMode = ref(false);
const showDragBanner = ref(true);

const productImageInputRef = ref(null);
const engravedImageInputRef = ref(null);

const productForm = ref({
  id: '',
  name: '',
  image: '',
  engravedImage: '',
  availableSizes: ['20 Oz', '30 Oz', '40 Oz'],
  availablePositions: ['Vertical', 'Horizontal'],
  defaultDuration: '03:45',
  maxChars: 7,
  isActive: true
});

const showStaffPin = ref(false);

const staffForm = ref({
  id: '',
  staffId: '',
  name: '',
  username: '',
  whatsapp: '',
  pin: '',
  role: 'Staff Store',
  store: '',
  status: 'Active'
});

// Master Product Catalog - Pre-seeded with Stanley Cup Models
const defaultProducts = [
  {
    id: 'prod-quencher-40',
    name: 'Quencher H2.O FlowState 40 Oz',
    image: productStep1,
    engravedImage: productStep2,
    availableSizes: ['20 Oz', '30 Oz', '40 Oz'],
    availablePositions: ['Vertical', 'Horizontal'],
    defaultDuration: '03:45',
    maxChars: 7,
    isActive: true
  },
  {
    id: 'prod-iceflow-30',
    name: 'IceFlow Flip Straw 30 Oz',
    image: productIceflow,
    engravedImage: productStep2,
    availableSizes: ['16 Oz', '30 Oz'],
    availablePositions: ['Vertical', 'Horizontal'],
    defaultDuration: '03:30',
    maxChars: 7,
    isActive: true
  }
];
const products = ref([...defaultProducts]);

// Master Developer Access Account (Protected Super Admin)
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

// Master Staff Accounts - Developer account is permanent and protected
const defaultStaffUsers = [DEVELOPER_ACCOUNT];
const staffUsers = ref([...defaultStaffUsers]);

let pollInterval = null;
let eventSource = null;

async function loadStaffAccounts() {
  const token = localStorage.getItem('stanley_staff_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch('/api/staff', { headers });
    if (res.ok) {
      const serverStaff = await res.json();
      if (Array.isArray(serverStaff) && serverStaff.length > 0) {
        const withoutDev = serverStaff.filter(u => u && u.username !== 'devsosco01' && u.staffId !== 'devsosco01' && u.id !== 'devsosco01');
        staffUsers.value = [DEVELOPER_ACCOUNT, ...withoutDev];
        localStorage.setItem('stanley_staff_users', JSON.stringify(staffUsers.value));
        return;
      }
    }
  } catch (e) {}

  const savedStaff = localStorage.getItem('stanley_staff_users');
  if (savedStaff) {
    try {
      const parsedStaff = JSON.parse(savedStaff);
      if (Array.isArray(parsedStaff) && parsedStaff.length > 0) {
        const withoutDev = parsedStaff.filter(u => u && u.username !== 'devsosco01' && u.staffId !== 'devsosco01' && u.id !== 'devsosco01');
        staffUsers.value = [DEVELOPER_ACCOUNT, ...withoutDev];
      }
    } catch (e) {}
  }
}

async function loadProducts() {
  const token = localStorage.getItem('stanley_staff_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  try {
    const res = await fetch('/api/products', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        products.value = data;
        localStorage.setItem('stanley_product_catalog_order', JSON.stringify(data));
        return;
      }
    }
  } catch (e) {}

  const saved = localStorage.getItem('stanley_product_catalog_order');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        products.value = parsed;
      }
    } catch (e) {}
  }
}

onMounted(async () => {
  try {
    await loadProducts();
    await loadStoreLocations();
    await loadStaffAccounts();
    await loadSizePresets();

    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/events');
        eventSource.addEventListener('products_updated', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (Array.isArray(data) && data.length > 0) {
              products.value = data;
              localStorage.setItem('stanley_product_catalog_order', JSON.stringify(data));
            }
          } catch (err) {}
        });
        eventSource.addEventListener('settings_updated', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data && data.key === 'products' && Array.isArray(data.value) && data.value.length > 0) {
              products.value = data.value;
              localStorage.setItem('stanley_product_catalog_order', JSON.stringify(data.value));
            } else if (data && data.key === 'size_presets' && Array.isArray(data.value) && data.value.length > 0) {
              sizePresets.value = data.value;
              localStorage.setItem('stanley_size_presets', JSON.stringify(data.value));
            }
          } catch (err) {}
        });
        eventSource.addEventListener('staff_updated', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (Array.isArray(data) && data.length > 0) {
              const withoutDev = data.filter(u => u && u.username !== 'devsosco01' && u.staffId !== 'devsosco01' && u.id !== 'devsosco01');
              staffUsers.value = [DEVELOPER_ACCOUNT, ...withoutDev];
              localStorage.setItem('stanley_staff_users', JSON.stringify(staffUsers.value));
            }
          } catch (err) {}
        });
        eventSource.addEventListener('stores_updated', (e) => {
          try {
            const data = JSON.parse(e.data);
            const list = Array.isArray(data) ? data : (data && Array.isArray(data.stores) ? data.stores : []);
            if (list.length > 0) {
              storeLocationsList.value = list.map(s => s && s.name).filter(Boolean);
              localStorage.setItem('stanley_custom_stores', JSON.stringify(list));
            }
          } catch (err) {}
        });
      } catch (e) {}
    }

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('stanley_staff_updated', handleStorageUpdate);
    window.addEventListener('stanley_stores_updated', handleStorageUpdate);
    window.addEventListener('stanley_products_updated', handleStorageUpdate);
    window.addEventListener('stanley_size_presets_updated', handleStorageUpdate);

    pollInterval = setInterval(() => {
      loadProducts();
      loadSizePresets();
      loadStaffAccounts();
      loadStoreLocations();
    }, 3000);
  } catch (e) {
    console.error('Failed to load saved settings data:', e);
  }
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  if (eventSource) eventSource.close();
  window.removeEventListener('storage', handleStorageUpdate);
  window.removeEventListener('stanley_staff_updated', handleStorageUpdate);
  window.removeEventListener('stanley_stores_updated', handleStorageUpdate);
  window.removeEventListener('stanley_products_updated', handleStorageUpdate);
  window.removeEventListener('stanley_size_presets_updated', handleStorageUpdate);
});

function handleStorageUpdate() {
  loadProducts();
  loadSizePresets();
  loadStaffAccounts();
  loadStoreLocations();
}

async function persistProducts() {
  try {
    localStorage.setItem('stanley_product_catalog_order', JSON.stringify(products.value));
    window.dispatchEvent(new Event('stanley_products_updated'));
  } catch (e) {
    console.error('Failed to persist product order:', e);
  }

  const token = localStorage.getItem('stanley_staff_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    await fetch('/api/products', {
      method: 'POST',
      headers,
      body: JSON.stringify(products.value)
    });
  } catch (e) {
    console.warn('Failed to sync products to SQLite server:', e);
  }
}

function persistStaffUsers() {
  try {
    localStorage.setItem('stanley_staff_users', JSON.stringify(staffUsers.value));
    window.dispatchEvent(new Event('stanley_staff_updated'));
  } catch (e) {
    console.error('Failed to persist staff accounts:', e);
  }
}

// Filtered Lists
const filteredProducts = computed(() => {
  const list = Array.isArray(products.value) ? products.value.filter(Boolean) : [];
  const q = (searchQuery.value || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter(p => p && p.name && p.name.toLowerCase().includes(q));
});

const filteredStaffUsers = computed(() => {
  const list = Array.isArray(staffUsers.value) ? staffUsers.value.filter(Boolean) : [];
  const q = (searchQuery.value || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter(u => 
    u && (
      (u.name && String(u.name).toLowerCase().includes(q)) || 
      (u.staffId && String(u.staffId).toLowerCase().includes(q)) || 
      (u.idCode && String(u.idCode).toLowerCase().includes(q)) || 
      (u.username && String(u.username).toLowerCase().includes(q)) || 
      (u.whatsapp && String(u.whatsapp).toLowerCase().includes(q)) || 
      (u.role && String(u.role).toLowerCase().includes(q)) || 
      (u.store && String(u.store).toLowerCase().includes(q))
    )
  );
});

// Drag and drop reordering (Desktop + Mobile/Tablet Touch Support)
const draggedIndex = ref(null);
const touchOverIndex = ref(null);

function handleDragStart(index, event) {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index);
  }
}

function handleDragOver(index, event) {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleDrop(targetIndex, event) {
  const sourceIndex = draggedIndex.value;
  if (sourceIndex !== null && sourceIndex !== targetIndex && products.value[sourceIndex] && products.value[targetIndex]) {
    // Direct 1-to-1 swap between the two dragged cards without shifting the rest
    const temp = products.value[sourceIndex];
    products.value[sourceIndex] = products.value[targetIndex];
    products.value[targetIndex] = temp;
    persistProducts();
  }
  draggedIndex.value = null;
  touchOverIndex.value = null;
}

function handleDragEnd() {
  draggedIndex.value = null;
  touchOverIndex.value = null;
}

// Tablet / iPad Touch Drag Support
function handleTouchStart(index, event) {
  draggedIndex.value = index;
  touchOverIndex.value = index;
}

function handleTouchMove(event) {
  if (draggedIndex.value === null) return;
  const touch = event.touches[0];
  if (!touch) return;
  
  // Find which product card is underneath the user's finger on iPad / Tablet
  const elem = document.elementFromPoint(touch.clientX, touch.clientY);
  if (elem) {
    const card = elem.closest('.product-config-card');
    if (card && card.dataset.index !== undefined) {
      const targetIdx = parseInt(card.dataset.index, 10);
      if (!isNaN(targetIdx)) {
        touchOverIndex.value = targetIdx;
      }
    }
  }
}

function handleTouchEnd(event) {
  if (draggedIndex.value !== null && touchOverIndex.value !== null && draggedIndex.value !== touchOverIndex.value) {
    const sourceIndex = draggedIndex.value;
    const targetIndex = touchOverIndex.value;
    if (products.value[sourceIndex] && products.value[targetIndex]) {
      // Direct 1-to-1 swap between the two dragged cards without shifting the rest
      const temp = products.value[sourceIndex];
      products.value[sourceIndex] = products.value[targetIndex];
      products.value[targetIndex] = temp;
      persistProducts();
    }
  }
  draggedIndex.value = null;
  touchOverIndex.value = null;
}

// Delete Product from Catalog Permanently
function deleteProduct(product, index) {
  const confirmDelete = window.confirm(`Are you sure you want to delete "${product.name}"? This product will be removed from the catalog.`);
  if (!confirmDelete) return;
  const idx = products.value.findIndex(p => p.id === product.id);
  if (idx > -1) {
    products.value.splice(idx, 1);
    persistProducts();
  }
}

function toggleProductActive(product) {
  product.isActive = !product.isActive;
  persistProducts();
}

// =========================================================================
// PRODUCT MODAL HANDLERS (Figma 350:353)
// =========================================================================
function openAddProductModal() {
  isEditMode.value = false;
  isEditingSizes.value = false;
  cancelCustomSize();
  productForm.value = {
    id: '',
    name: '',
    image: '',
    engravedImage: '',
    availableSizes: sortOzSizes(['20 Oz', '30 Oz', '40 Oz']),
    availablePositions: ['Vertical', 'Horizontal'],
    defaultDuration: '03:45',
    maxChars: 7,
    isActive: true
  };
  showProductModal.value = true;
}

function openEditProductModal(product) {
  isEditMode.value = true;
  isEditingSizes.value = false;
  cancelCustomSize();
  productForm.value = {
    id: product.id,
    name: product.name,
    image: product.image || '',
    engravedImage: product.engravedImage || '',
    availableSizes: sortOzSizes([...(product.availableSizes || ['20 Oz', '30 Oz', '40 Oz'])]),
    availablePositions: [...(product.availablePositions || ['Vertical', 'Horizontal'])],
    defaultDuration: product.defaultDuration || '03:45',
    maxChars: product.maxChars || 7,
    isActive: product.isActive !== false
  };
  showProductModal.value = true;
}

function closeProductModal() {
  showProductModal.value = false;
  isEditingSizes.value = false;
  cancelCustomSize();
}

// File Upload Triggers
function triggerProductImageUpload() {
  if (productImageInputRef.value) {
    productImageInputRef.value.click();
  }
}

function triggerEngravedImageUpload() {
  if (engravedImageInputRef.value) {
    engravedImageInputRef.value.click();
  }
}

// Process Image Files via FileReader
function processFile(file, callback) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('File size exceeds 5MB limit. Please choose a smaller image.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    callback(e.target.result);
  };
  reader.readAsDataURL(file);
}

function onProductImageFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) {
    processFile(file, (dataUrl) => {
      productForm.value.image = dataUrl;
    });
  }
}

function handleProductImageDrop(e) {
  const file = e.dataTransfer.files?.[0];
  if (file) {
    processFile(file, (dataUrl) => {
      productForm.value.image = dataUrl;
    });
  }
}

function onEngravedImageFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) {
    processFile(file, (dataUrl) => {
      productForm.value.engravedImage = dataUrl;
    });
  }
}

function handleEngravedImageDrop(e) {
  const file = e.dataTransfer.files?.[0];
  if (file) {
    processFile(file, (dataUrl) => {
      productForm.value.engravedImage = dataUrl;
    });
  }
}

// Option Toggles in Modal
function toggleSizeOption(size) {
  if (isEditingSizes.value) return;
  const idx = productForm.value.availableSizes.indexOf(size);
  if (idx > -1) {
    if (productForm.value.availableSizes.length > 1) {
      productForm.value.availableSizes.splice(idx, 1);
    }
  } else {
    productForm.value.availableSizes.push(size);
    productForm.value.availableSizes = sortOzSizes(productForm.value.availableSizes);
  }
}

function toggleEditSizesMode() {
  isEditingSizes.value = !isEditingSizes.value;
  if (!isEditingSizes.value) {
    cancelCustomSize();
  }
}

function deleteSizePreset(sizeOpt) {
  const idx = sizePresets.value.indexOf(sizeOpt);
  if (idx > -1) {
    sizePresets.value.splice(idx, 1);
    persistSizePresets();
  }
  const formIdx = (productForm.value.availableSizes || []).indexOf(sizeOpt);
  if (formIdx > -1) {
    productForm.value.availableSizes.splice(formIdx, 1);
  }
}

// Custom Oz Handlers
const showCustomSizeInput = ref(false);
const customSizeValue = ref('');
const customSizeInputRef = ref(null);

function openCustomSizeInput() {
  showCustomSizeInput.value = true;
  customSizeValue.value = '';
  setTimeout(() => {
    if (customSizeInputRef.value) customSizeInputRef.value.focus();
  }, 60);
}

function cancelCustomSize() {
  showCustomSizeInput.value = false;
  customSizeValue.value = '';
}

function submitCustomSize() {
  const raw = (customSizeValue.value || '').trim();
  if (!raw) {
    cancelCustomSize();
    return;
  }
  let formatted = raw;
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(?:oz|ounces?)?$/i);
  if (match) {
    formatted = `${match[1]} Oz`;
  } else if (!/oz/i.test(raw)) {
    formatted = `${raw} Oz`;
  }

  if (!sizePresets.value.includes(formatted)) {
    sizePresets.value.push(formatted);
    sizePresets.value = sortOzSizes(sizePresets.value);
    persistSizePresets();
  }
  if (!productForm.value.availableSizes.includes(formatted)) {
    productForm.value.availableSizes.push(formatted);
    productForm.value.availableSizes = sortOzSizes(productForm.value.availableSizes);
  }
  cancelCustomSize();
}

function togglePositionOption(pos) {
  const idx = productForm.value.availablePositions.indexOf(pos);
  if (idx > -1) {
    if (productForm.value.availablePositions.length > 1) {
      productForm.value.availablePositions.splice(idx, 1);
    }
  } else {
    productForm.value.availablePositions.push(pos);
  }
}

// Save Product Form (Add or Edit)
function saveProductForm() {
  if (!productForm.value.name.trim()) return;

  const fallbackImage = productForm.value.image || '/src/assets/images/machine-cup-1.png';
  const fallbackEngraved = productForm.value.engravedImage || '/src/assets/images/product-step2.png';

  if (isEditMode.value) {
    const idx = products.value.findIndex(p => p.id === productForm.value.id);
    if (idx > -1) {
      products.value[idx] = {
        ...products.value[idx],
        name: productForm.value.name.trim(),
        image: fallbackImage,
        engravedImage: fallbackEngraved,
        availableSizes: [...productForm.value.availableSizes],
        availablePositions: [...productForm.value.availablePositions],
        isActive: productForm.value.isActive
      };
      persistProducts();
    }
  } else {
    const newProd = {
      id: `prod-${Date.now()}`,
      name: productForm.value.name.trim(),
      modelKey: productForm.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      image: fallbackImage,
      engravedImage: fallbackEngraved,
      availableSizes: [...productForm.value.availableSizes],
      availablePositions: [...productForm.value.availablePositions],
      defaultDuration: '03:45',
      maxChars: 7,
      isActive: productForm.value.isActive
    };
    products.value.push(newProd);
    persistProducts();
  }

  showProductModal.value = false;
}

// Staff handlers
function openAddStaffModal() {
  isEditStaffMode.value = false;
  showStaffPin.value = false;
  const storeOptions = AVAILABLE_STORE_LOCATIONS.value || [];
  staffForm.value = {
    id: '',
    staffId: '',
    name: '',
    username: '',
    whatsapp: '',
    pin: '',
    role: 'Staff Store',
    store: storeOptions.length > 0 ? storeOptions[0] : '',
    status: 'Active'
  };
  showStaffModal.value = true;
}

function openEditStaffModal(user) {
  if (user.isDeveloper || user.username === 'devsosco01' || user.staffId === 'devsosco01' || user.id === 'devsosco01') {
    return; // Developer master account is protected
  }
  isEditStaffMode.value = true;
  showStaffPin.value = false;
  staffForm.value = {
    id: user.id,
    staffId: user.staffId || user.idCode || '',
    name: user.name,
    username: user.username || user.name,
    whatsapp: user.whatsapp || '',
    pin: '',
    role: user.role || 'Staff Store',
    store: user.store || '',
    status: user.status || 'Active'
  };
  showStaffModal.value = true;
}

function closeStaffModal() {
  showStaffModal.value = false;
}

async function saveStaffForm() {
  if (!staffForm.value.name.trim() || !staffForm.value.staffId.trim()) return;

  const cleanPin = (staffForm.value.pin || '').trim();
  let targetUser = null;

  if (isEditStaffMode.value) {
    const idx = staffUsers.value.findIndex(u => u.id === staffForm.value.id);
    if (idx > -1) {
      staffUsers.value[idx] = {
        ...staffUsers.value[idx],
        staffId: staffForm.value.staffId.trim().toUpperCase(),
        idCode: staffForm.value.staffId.trim().toUpperCase(),
        name: staffForm.value.name.trim(),
        username: staffForm.value.username.trim() || staffForm.value.name.trim(),
        whatsapp: staffForm.value.whatsapp.trim(),
        pin: cleanPin,
        role: staffForm.value.role,
        store: (staffForm.value.store || '').trim(),
        status: staffForm.value.status
      };
      targetUser = staffUsers.value[idx];
      persistStaffUsers();
    }
  } else {
    const newUser = {
      id: `usr-${Date.now()}`,
      staffId: staffForm.value.staffId.trim().toUpperCase(),
      idCode: staffForm.value.staffId.trim().toUpperCase(),
      name: staffForm.value.name.trim(),
      username: staffForm.value.username.trim() || staffForm.value.name.trim(),
      whatsapp: staffForm.value.whatsapp.trim(),
      pin: cleanPin || '1234',
      role: staffForm.value.role,
      store: (staffForm.value.store || '').trim(),
      status: staffForm.value.status
    };
    staffUsers.value.push(newUser);
    targetUser = newUser;
    persistStaffUsers();
  }

  // Sync to SQLite backend database
  if (targetUser) {
    try {
      const token = localStorage.getItem('stanley_staff_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/staff', {
        method: 'POST',
        headers,
        body: JSON.stringify(targetUser)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.staff) && data.staff.length > 0) {
          const withoutDev = data.staff.filter(u => u && u.username !== 'devsosco01' && u.staffId !== 'devsosco01' && u.id !== 'devsosco01');
          staffUsers.value = [DEVELOPER_ACCOUNT, ...withoutDev];
          localStorage.setItem('stanley_staff_users', JSON.stringify(staffUsers.value));
        }
      }
    } catch (e) {
      console.warn('Failed to sync staff user to SQLite backend:', e);
    }
  }

  showStaffModal.value = false;
}

async function deleteStaff(user) {
  if (user.isDeveloper || user.username === 'devsosco01' || user.staffId === 'devsosco01' || user.id === 'devsosco01') {
    return; // Developer master account cannot be deleted
  }
  const confirmDelete = window.confirm(`Are you sure you want to delete staff "${user.name}" (${user.staffId || user.idCode})?`);
  if (!confirmDelete) return;
  const idx = staffUsers.value.findIndex(u => u.id === user.id);
  if (idx > -1) {
    staffUsers.value.splice(idx, 1);
    persistStaffUsers();
  }

  try {
    const token = localStorage.getItem('stanley_staff_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/staff/${user.id || user.staffId}`, {
      method: 'DELETE',
      headers
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.staff)) {
        const withoutDev = data.staff.filter(u => u && u.username !== 'devsosco01' && u.staffId !== 'devsosco01' && u.id !== 'devsosco01');
        staffUsers.value = [DEVELOPER_ACCOUNT, ...withoutDev];
        localStorage.setItem('stanley_staff_users', JSON.stringify(staffUsers.value));
      }
    }
  } catch (e) {
    console.warn('Failed to delete staff user on SQLite server:', e);
  }
}
</script>

<style scoped>
.settings-screen {
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

/* Header */
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

/* Dashboard Body */
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

/* Settings Heading (Figma 362:1165) */
.settings-header-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  text-transform: uppercase;
  margin: 0;
  letter-spacing: 0.02em;
}

.settings-subtitle {
  font-size: 13px;
  color: #6B7280;
  margin: 0;
}

/* Tabs & Controls Bar (Figma 362:1170) */
.tabs-and-controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
  flex-wrap: wrap;
}

.segmented-tab-container {
  background: #F5F5F5;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.tab-btn {
  height: 40px;
  width: 96px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn.is-active {
  background: #000000;
  color: #FFFFFF;
  font-weight: 600;
}

.search-and-cta-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box-wrap {
  position: relative;
  width: 340px;
  background: #F5F5F5;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
}

.search-icon {
  color: #9CA3AF;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 13px;
  color: #111827;
  outline: none;
}

.search-input::placeholder {
  color: #9CA3AF;
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  font-size: 12px;
}

.cta-black-btn {
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

.cta-black-btn:hover {
  opacity: 0.85;
}

/* Product Tab Section & Banner (Figma 362:2264) */
.product-tab-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.drag-reorder-banner {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.banner-left-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.drag-dots-icon {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 2px;
  flex-shrink: 0;
}

.dot-row {
  display: flex;
  gap: 3px;
}

.dot {
  width: 3px;
  height: 3px;
  background-color: #9CA3AF;
  border-radius: 50%;
}

.banner-desc {
  font-size: 13px;
  color: #4B5563;
  margin: 0;
  line-height: 1.4;
}

.banner-close-btn {
  background: transparent;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.banner-close-btn:hover {
  color: #111827;
  background: #E5E7EB;
}

/* Empty Settings State (Product & Staff) */
.empty-settings-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 60px 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.empty-settings-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.empty-settings-icon-wrap {
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

.empty-settings-title {
  font-size: 16px;
  font-weight: 600;
  color: #18181B;
  margin: 0;
}

.empty-settings-desc {
  font-size: 13px;
  color: #71717A;
  margin: 0;
  max-width: 380px;
  line-height: 1.5;
}

.empty-settings-add-btn {
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

.empty-settings-add-btn:hover {
  opacity: 0.85;
}

.table-empty-row {
  height: 280px;
}

.td-empty-state {
  text-align: center;
  padding: 48px 24px !important;
}

/* Product Cards 3-Column Grid - Guaranteed 3 Cards in a Row on Desktop & Tablet/iPad */
.product-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(10px, 1.4vw, 20px);
  width: 100%;
}

/* Product Card */
.product-config-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: clamp(14px, 1.3vw, 18px);
  display: flex;
  gap: clamp(10px, 1.2vw, 16px);
  min-height: 230px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  user-select: none;
  touch-action: pan-y;
  position: relative;
}

.product-config-card:hover {
  border-color: #CBD5E1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.product-config-card.is-dragging {
  opacity: 0.35;
  border: 2px dashed #000000;
  transform: scale(0.98);
}

.product-config-card.is-touch-target {
  border: 2px dashed #10B981;
  background-color: #F0FDF4;
  transform: scale(1.02);
}

.product-config-card.is-inactive-card {
  opacity: 0.65;
  background-color: #FAFAFA;
}

/* Left Affordance Col */
.card-left-affordance {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 24px;
  flex-shrink: 0;
  padding-bottom: 4px;
}

.order-badge {
  width: 22px;
  height: 22px;
  background: #000000;
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-drag-handle {
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: grab;
  padding: 8px 4px;
  touch-action: none;
}

.card-drag-handle:active {
  cursor: grabbing;
}

/* Product Thumbnail Box - Proportional and Prominent */
.product-thumb-box {
  width: clamp(85px, 9.5vw, 130px);
  height: 100%;
  min-height: 155px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 2px 0;
}

.product-preview-img {
  width: 100%;
  height: 100%;
  max-height: 165px;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.07));
  transition: transform 0.2s ease;
}

/* Meta Details */
.card-meta-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px; /* Generous breathing room between title and configuration pills */
}

.product-name-heading {
  font-size: clamp(12px, 1.1vw, 14.5px);
  font-weight: 700;
  color: #0F172A;
  margin: 0;
  line-height: 1.3;
}

.product-status-pill {
  font-size: clamp(9.5px, 0.9vw, 11px);
  font-weight: 700;
  white-space: nowrap;
}

.product-status-pill.status-active {
  color: #00C950;
}

.product-status-pill.status-inactive {
  color: #9CA3AF;
}

.specs-tags-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: auto;
  padding-bottom: 14px;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.spec-tag-pill {
  background: #F4F4F5;
  color: #3F3F46;
  font-size: clamp(10.5px, 0.95vw, 12px);
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
  line-height: 1.3;
}

/* Bottom Action Buttons */
.card-bottom-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.card-edit-btn {
  flex: 1;
  height: 38px;
  background: #FFFFFF;
  border: 1px solid #000000;
  border-radius: 6px;
  font-size: clamp(11.5px, 1vw, 13px);
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.card-edit-btn:hover {
  background: #000000;
  color: #FFFFFF;
}

.card-delete-btn {
  width: 38px;
  height: 38px;
  background: #FFFFFF;
  border: 1px solid #000000;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000000;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.card-delete-btn:hover {
  background: #FEE2E2;
  border-color: #EF4444;
  color: #EF4444;
}

/* User Tab Table (Figma 131:1949) */
.user-table-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

.user-data-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  text-align: left;
}

.user-th-row {
  background: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
  height: 60px;
}

.user-th {
  padding: 0 16px;
  font-size: 12px;
  font-weight: 700;
  color: #000000;
  white-space: nowrap;
}

.user-tr {
  height: 60px;
  background: #FFFFFF;
  border-bottom: 1px solid #F3F4F6;
  transition: background-color 0.15s ease;
}

.user-tr:hover {
  background-color: #FAFAFA;
}

.user-td {
  padding: 0 16px;
  font-size: 12px;
  font-weight: 400;
  color: #000000;
  white-space: nowrap;
  vertical-align: middle;
}

.user-status-text {
  font-size: 14px;
  font-weight: 700;
  color: #000000;
}

.user-status-text.is-inactive {
  color: #000000;
  font-weight: 700;
}

.user-actions-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-user-icon-edit {
  width: 40px;
  height: 40px;
  background: #F3F4F6;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-user-icon-edit:hover {
  background: #E5E7EB;
}

.btn-user-icon-delete {
  width: 40px;
  height: 40px;
  background: #FEF2F2;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-user-icon-delete:hover {
  background: #FEE2E2;
}

/* Protected Developer Account Styles */
.user-tr.developer-row {
  background: #FAFAFA;
}

.user-tr.developer-row:hover {
  background: #F4F4F5;
}

.staff-id-text.dev-id-text {
  font-weight: 700;
  color: #18181B;
  font-family: monospace;
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name-text {
  font-weight: 600;
  color: #18181B;
}

.dev-badge-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  background: #18181B;
  color: #FFFFFF;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.user-role-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: #F4F4F5;
  color: #3F3F46;
}

.user-role-badge.role-super-admin {
  background: #EFF6FF;
  color: #1D4ED8;
  border: 1px solid #DBEAFE;
}

.developer-protected-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #F4F4F5;
  border: 1px solid #E4E4E7;
  border-radius: 6px;
  color: #52525B;
  font-size: 11px;
  font-weight: 600;
  cursor: default;
  user-select: none;
}

.developer-protected-badge svg {
  color: #71717A;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: clamp(10px, 2.5vw, 24px);
  box-sizing: border-box;
  overflow-y: auto;
}

.modal-card {
  background: #FFFFFF;
  border-radius: 12px;
  width: 100%;
  max-width: 540px;
  max-height: min(90vh, 90dvh);
  overflow-y: auto;
  padding: clamp(16px, 2vw, 24px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Product Modal (Figma 350:353) - Fully Responsive for Larger Screens / iPad / Tablet / Mobile */
.product-modal-card {
  background: #FFFFFF;
  border-radius: 16px;
  width: 100%;
  max-width: min(94vw, 840px);
  max-height: min(92vh, 92dvh);
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  transition: max-width 0.2s ease;
}

@media (min-width: 1200px) {
  .product-modal-card {
    max-width: 960px;
  }
}

@media (min-width: 1600px) {
  .product-modal-card {
    max-width: 1080px;
  }
}

.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(14px, 1.8vw, 20px) clamp(16px, 2.2vw, 24px);
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
  background: #FFFFFF;
}

.modal-title-bold {
  font-size: clamp(14px, 1.2vw, 16px);
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

.modal-form-content {
  padding: clamp(14px, 2vw, 24px);
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 1.6vw, 18px);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Custom Sleek Scrollbar */
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
  gap: clamp(10px, 1.5vw, 16px);
  width: 100%;
}

.image-upload-column {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-box-heading {
  font-size: clamp(12px, 1.1vw, 14px);
  font-weight: 700;
  color: #000000;
}

.upload-dropzone-box {
  border: 2px dashed #E2E8F0;
  border-radius: 14px;
  height: clamp(140px, 20vh, 230px);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FAFCFF;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  padding: 10px;
  box-sizing: border-box;
}

.upload-dropzone-box:hover {
  border-color: #94A3B8;
  background: #F1F5F9;
}

.upload-dropzone-box.has-image {
  border-style: solid;
  border-color: #E2E8F0;
  background: #FFFFFF;
}

.hidden-file-input {
  display: none;
}

.uploaded-preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.upload-overlay-actions {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.btn-overlay-action {
  background: transparent;
  border: none;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-overlay-action:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-overlay-action.btn-remove {
  color: #F87171;
}

.upload-icon-circle {
  background: #F1F5F9;
  border-radius: 10px;
  width: clamp(32px, 4vw, 40px);
  height: clamp(32px, 4vw, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.upload-prompt-text {
  font-size: clamp(11px, 1vw, 12px);
  font-weight: 700;
  color: #64748B;
  text-align: center;
}

.upload-format-hint {
  font-size: 10px;
  color: #94A3B8;
  margin-top: 2px;
}

.product-name-input-block {
  width: 100%;
  padding-top: 2px;
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
}

.product-name-underline-input::placeholder {
  color: #ABABAB;
}

.select-dropdown-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.product-name-underline-select {
  width: 100%;
  border: none;
  border-bottom: 1px solid #000000;
  padding: 10px 24px 10px 0;
  font-size: clamp(13px, 1.1vw, 14px);
  font-weight: 500;
  color: #000000;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  border-radius: 0;
}

.product-name-underline-select:focus {
  border-bottom-width: 1.5px;
}

.select-chevron-icon {
  position: absolute;
  right: 0;
  pointer-events: none;
  color: #000000;
}

.params-three-col-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  gap: clamp(14px, 2vw, 24px);
  align-items: flex-start;
  padding-top: 4px;
  width: 100%;
}

.param-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  justify-content: flex-start;
}

.param-col-title {
  font-size: clamp(12.5px, 1.05vw, 14px);
  font-weight: 700;
  color: #000000;
  margin: 0;
  line-height: 1.2;
  min-height: 18px;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.param-pills-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-height: 38px;
}

.figma-option-pill {
  height: 38px;
  border: 1px solid #000000;
  border-radius: 8px;
  padding: 0 clamp(10px, 1vw, 14px);
  font-size: clamp(12px, 1vw, 13.5px);
  font-family: inherit;
  background: #FFFFFF;
  color: #000000;
  cursor: pointer;
  opacity: 0.45;
  transition: all 0.15s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.figma-option-pill.is-selected {
  opacity: 1;
  border-width: 1.5px;
  font-weight: 600;
}

.preset-pill-item {
  display: inline-flex;
  align-items: center;
  position: relative;
}

.pill-remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background-color: #EF4444;
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  margin-left: 6px;
  line-height: 1;
  transition: transform 0.15s ease, background-color 0.15s ease;
  cursor: pointer;
}

.pill-remove-btn:hover {
  transform: scale(1.2);
  background-color: #DC2626;
}

.figma-option-pill.is-editing-mode {
  border-style: dashed;
  cursor: default;
}

.figma-option-pill.is-editing-mode:hover {
  border-color: #EF4444;
  background-color: #FEF2F2;
}

.btn-edit-presets {
  background: #F1F5F9;
  border-color: #CBD5E1;
  color: #475569;
  opacity: 0.9;
  font-weight: 600;
}

.btn-edit-presets:hover {
  opacity: 1;
  background: #E2E8F0;
  color: #0F172A;
  border-color: #94A3B8;
}

.btn-edit-presets.is-done-active {
  background: #000000;
  color: #FFFFFF;
  border-color: #000000;
  opacity: 1;
}

.btn-edit-presets.is-done-active:hover {
  background: #1E293B;
  border-color: #1E293B;
}

.btn-add-custom-size {
  border-style: dashed;
  border-color: #64748B;
  color: #334155;
  background: #F8FAFC;
  opacity: 0.9;
  font-weight: 500;
}

.btn-add-custom-size:hover {
  opacity: 1;
  border-color: #000000;
  color: #000000;
  background: #F1F5F9;
}

.custom-size-input-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #FFFFFF;
  border: 1.5px solid #000000;
  border-radius: 8px;
  padding: 2px 4px 2px 8px;
  height: 38px;
  box-sizing: border-box;
}

.custom-size-input {
  width: 54px;
  border: none;
  outline: none;
  font-size: 13px;
  font-family: inherit;
  font-weight: 600;
  color: #000000;
  background: transparent;
}

.btn-custom-size-add {
  padding: 4px 8px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-custom-size-add:hover {
  opacity: 0.85;
}

.btn-custom-size-cancel {
  padding: 2px 6px;
  background: transparent;
  color: #64748B;
  border: none;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
}

.btn-custom-size-cancel:hover {
  background: #F1F5F9;
  color: #000000;
}

.segmented-status-container {
  background: #F5F5F5;
  border-radius: 8px;
  padding: 3px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 38px;
  width: fit-content;
  box-sizing: border-box;
}

.status-segment-btn {
  height: 32px;
  padding: 0 clamp(12px, 1.1vw, 16px);
  min-width: 70px;
  border-radius: 6px;
  border: none;
  font-size: clamp(12px, 1vw, 13.5px);
  font-weight: 500;
  background: transparent;
  color: #000000;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-segment-btn.is-active {
  background: #000000;
  color: #FFFFFF;
  font-weight: 600;
}

@media (max-width: 720px) {
  .params-three-col-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.modal-bottom-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding-top: 8px;
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

  .upload-dropzone-box {
    height: 135px;
  }

  .params-three-col-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Staff Modal Form */
.modal-headline {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.modal-subheadline {
  font-size: 13px;
  color: #6B7280;
  margin: 4px 0 0 0;
}

.modal-close-x {
  background: transparent;
  border: none;
  font-size: 18px;
  color: #9CA3AF;
  cursor: pointer;
  padding: 4px 8px;
}

.param-edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.form-input {
  height: 40px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  border-color: #111827;
}

.form-row-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-footer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.btn-secondary {
  height: 40px;
  padding: 0 16px;
  background: #FFFFFF;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
}

.btn-primary-black {
  height: 40px;
  padding: 0 20px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-primary-black:hover {
  opacity: 0.85;
}

.fade-in {
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

/* Responsive Media Queries - Guaranteed 3 Product Cards in a Row on iPad / Tablet */
@media (max-width: 1100px) {
  .product-cards-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
}

@media (max-width: 700px) {
  .product-cards-grid {
    grid-template-columns: repeat(3, minmax(260px, 1fr));
    overflow-x: auto;
    gap: 10px;
    padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
