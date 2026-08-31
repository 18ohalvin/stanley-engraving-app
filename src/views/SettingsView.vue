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

        <!-- Right: Header Action Buttons -->
        <div class="header-actions">
          <button 
            type="button" 
            class="clear-orders-btn"
            @click="clearTestOrders"
            :disabled="isClearingOrders"
            title="Clear all test orders from database and reset live queue to 0"
          >
            <svg v-if="isClearingOrders" class="spinner-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25" stroke="currentColor"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>{{ isClearingOrders ? 'Clearing...' : 'Clear Test Orders' }}</span>
          </button>
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

          <!-- Product Loading Skeleton State (prevents flash of stale/mock data) -->
          <div v-if="isLoadingProducts" class="product-cards-grid">
            <div v-for="n in 3" :key="n" class="product-config-card is-skeleton">
              <div class="skeleton-shimmer skeleton-thumb"></div>
              <div class="skeleton-meta">
                <div class="skeleton-shimmer skeleton-title"></div>
                <div class="skeleton-shimmer skeleton-tags"></div>
                <div class="skeleton-shimmer skeleton-btn"></div>
              </div>
            </div>
          </div>

          <!-- Product Empty State when No Products Exist and Not Loading -->
          <div v-else-if="filteredProducts.length === 0" class="empty-settings-card">
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
            
            <!-- Image Containers: Product Image (width 235px) & Product Engraved (width 464px) (Figma 351:441) -->
            <div class="product-modal-images-row">
              
              <!-- Column 1: Product Image Box (Figma 350:383) -->
              <div class="product-image-box">
                <span class="modal-section-label">Product Image</span>
                <div 
                  class="figma-upload-dropzone" 
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
                    <img :src="productForm.image" alt="Product Thumbnail" class="figma-preview-img" />
                    <div class="upload-overlay-actions" @click.stop>
                      <button type="button" class="btn-overlay-action" @click="triggerProductImageUpload">Change</button>
                      <button type="button" class="btn-overlay-action btn-remove" @click="productForm.image = ''">Remove</button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="upload-icon-circle-figma">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                    <span class="upload-title-bold">Click to upload image</span>
                    <span class="upload-format-sub">PNG, JPG up to 5MB</span>
                  </template>
                </div>
              </div>

              <!-- Column 2: Product Engraved Box with Integrated Placement Tool (Figma 351:427) -->
              <div class="product-engraved-box">
                <span class="modal-section-label">Product Engraved</span>
                
                <div class="engraved-content-split">
                  <!-- Left: Engraved Preview / Dropzone with Interactive Text Placement Pin -->
                  <div 
                    class="figma-upload-dropzone engraved-dropzone" 
                    :class="{ 'has-image': !!productForm.engravedImage }"
                    ref="placementCanvasRef"
                    @click="!productForm.engravedImage ? triggerEngravedImageUpload() : handlePlacementCanvasClick($event)"
                    @mousedown="productForm.engravedImage && startPlacementDrag($event)"
                    @touchstart.passive="productForm.engravedImage && startPlacementTouch($event)"
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
                      <img :src="productForm.engravedImage" alt="Product Engraved Space" class="figma-preview-img engraved-target-img" />
                      
                      <!-- Draggable & Clickable Laser Text Marker Pin -->
                      <div 
                        class="interactive-text-pin"
                        :class="{ 'is-vertical': adminPreviewOrientation === 'Vertical', 'is-dragging': isDraggingPlacement }"
                        :style="{
                          top: `${productForm.textTop}%`,
                          left: `${productForm.textLeft}%`,
                          fontSize: `${productForm.textSize}px`
                        }"
                        @click.stop
                      >
                        <span class="pin-label">TEXT</span>
                      </div>

                      <div class="upload-overlay-actions" @click.stop>
                        <button type="button" class="btn-overlay-action" @click="triggerEngravedImageUpload">Change</button>
                        <button type="button" class="btn-overlay-action btn-remove" @click="productForm.engravedImage = ''">Remove</button>
                      </div>
                    </template>
                    <template v-else>
                      <div class="upload-icon-circle-figma">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      </div>
                      <span class="upload-title-bold">Click to upload image</span>
                      <span class="upload-format-sub">PNG, JPG up to 5MB</span>
                    </template>
                  </div>

                  <!-- Right: Controls for Text Placement (Disabled if no engraved image uploaded) -->
                  <div class="engraved-controls-column" :class="{ 'is-disabled': !productForm.engravedImage }">
                    <!-- Orientation Tabs (Figma 451:414) -->
                    <div class="orientation-tabs-pill">
                      <button 
                        type="button" 
                        class="orientation-tab-btn"
                        :class="{ 'is-active': adminPreviewOrientation === 'Horizontal' }"
                        @click="adminPreviewOrientation = 'Horizontal'"
                      >
                        Horizontal
                      </button>
                      <button 
                        type="button" 
                        class="orientation-tab-btn"
                        :class="{ 'is-active': adminPreviewOrientation === 'Vertical' }"
                        @click="adminPreviewOrientation = 'Vertical'"
                      >
                        Vertical
                      </button>
                    </div>

                    <!-- Vertical Position (Y) (Figma 452:443) -->
                    <div class="engraved-slider-item">
                      <span class="slider-figma-label">Vertical Position (Y)</span>
                      <input 
                        type="range" 
                        min="15" 
                        max="85" 
                        step="1"
                        v-model.number="productForm.textTop" 
                        class="figma-sleek-slider" 
                      />
                    </div>

                    <!-- Horizontal Position (X) (Figma 452:444) -->
                    <div class="engraved-slider-item">
                      <span class="slider-figma-label">Horizontal Position (X)</span>
                      <input 
                        type="range" 
                        min="20" 
                        max="80" 
                        step="1"
                        v-model.number="productForm.textLeft" 
                        class="figma-sleek-slider" 
                      />
                    </div>

                    <!-- Preview Text Size (Figma 452:451) -->
                    <div class="engraved-slider-item">
                      <span class="slider-figma-label">Preview Text Size</span>
                      <input 
                        type="range" 
                        min="8" 
                        max="18" 
                        step="1"
                        v-model.number="productForm.textSize" 
                        class="figma-sleek-slider" 
                      />
                    </div>

                    <!-- Interactive Guide Hint (Figma 452:437) -->
                    <p class="engraved-placement-hint">
                      Click or drag the text target on the tumbler preview to set exact engraving position.
                    </p>
                  </div>
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
              
              <!-- Available Size (Figma 350:404) -->
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
                        'is-unselected': !(productForm.availableSizes || []).includes(sizeOpt),
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

              <!-- Orientation (Figma 377:2336) -->
              <div class="param-column">
                <label class="param-col-title">Orientation</label>
                <div class="param-pills-wrap">
                  <button 
                    v-for="posOpt in ALL_POSITION_OPTIONS" 
                    :key="posOpt"
                    type="button" 
                    class="figma-option-pill"
                    :class="{ 
                      'is-selected': (productForm.availablePositions || []).includes(posOpt),
                      'is-unselected': !(productForm.availablePositions || []).includes(posOpt)
                    }"
                    @click="togglePositionOption(posOpt)"
                  >
                    {{ posOpt }}
                  </button>
                </div>
              </div>

              <!-- Shows in app (Figma 377:2354 & 452:425) -->
              <div class="param-column">
                <label class="param-col-title">Shows in app</label>
                <div class="figma-segmented-status-wrap">
                  <button 
                    type="button" 
                    class="figma-status-segment-btn"
                    :class="{ 'is-active': productForm.isActive }"
                    @click="productForm.isActive = true"
                  >
                    Active
                  </button>
                  <button 
                    type="button" 
                    class="figma-status-segment-btn"
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
                :disabled="isSavingProduct"
                @click="closeProductModal"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn-figma-save"
                :disabled="isSavingProduct"
              >
                <span v-if="!isSavingProduct">Save</span>
                <span v-else class="btn-spinner-inline">
                  <svg class="spinner-svg" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              </button>
            </div>

          </form>

        </div>
      </div>
    </Teleport>

    <!-- ADD / EDIT STAFF MODAL -->
    <Teleport to="body">
      <div v-if="showStaffModal" class="modal-backdrop" @click="closeStaffModal">
        <div class="product-modal-card staff-modal-card fade-in" @click.stop>
          
          <div class="modal-header-row">
            <h3 class="modal-title-bold">{{ isEditStaffMode ? 'Edit Staff User' : 'Add New Staff' }}</h3>
            <button type="button" class="modal-close-icon-btn" @click="closeStaffModal" aria-label="Close">
              ✕
            </button>
          </div>

          <form @submit.prevent="saveStaffForm" class="modal-form-content" autocomplete="off">
            
            <!-- Row 1: Staff ID & Full Name -->
            <div class="staff-modal-two-col">
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 6px;">Staff ID*</label>
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
                <label class="param-col-title" style="display:block; margin-bottom: 6px;">Full Name*</label>
                <input 
                  v-model="staffForm.name" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. Budi Santoso" 
                  required 
                />
              </div>
            </div>

            <!-- Row 2: Username & WhatsApp Number -->
            <div class="staff-modal-two-col">
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 6px;">Username (for login)*</label>
                <input 
                  v-model="staffForm.username" 
                  type="text" 
                  class="product-name-underline-input" 
                  placeholder="e.g. budi.s" 
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  required 
                />
              </div>
              <div class="product-name-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 6px;">WhatsApp Number</label>
                <input 
                  v-model="staffForm.whatsapp" 
                  type="tel" 
                  class="product-name-underline-input" 
                  placeholder="+62 812-xxxx-xxxx" 
                />
              </div>
            </div>

            <!-- Row 3: Assigned Store Location & PIN Code -->
            <div class="staff-modal-two-col">
              <div class="product-name-input-block custom-select-block">
                <label class="param-col-title" style="display:block; margin-bottom: 6px;">Assigned Store Location</label>
                <div class="select-underline-wrap">
                  <select 
                    v-model="staffForm.store" 
                    class="product-name-underline-input staff-select-input"
                  >
                    <option value="">HQ Central / Unassigned</option>
                    <option v-for="loc in AVAILABLE_STORE_LOCATIONS" :key="loc" :value="loc">
                      {{ loc }}
                    </option>
                  </select>
                  <div class="select-chevron-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              <div class="product-name-input-block pin-input-block">
                <label class="param-col-title" style="display:block; margin-bottom: 6px;">
                  PIN Code {{ isEditStaffMode ? '(Leave blank to keep current)' : '*' }}
                </label>
                <div class="pin-input-wrap">
                  <input 
                    v-model="staffForm.pin" 
                    :type="showStaffPin ? 'text' : 'password'" 
                    class="product-name-underline-input" 
                    placeholder="4-digit PIN (e.g. 1913)" 
                    maxlength="6"
                    autocomplete="new-password"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    :required="!isEditStaffMode"
                  />
                  <button 
                    type="button" 
                    class="btn-pin-toggle"
                    @click="showStaffPin = !showStaffPin" 
                    :title="showStaffPin ? 'Hide PIN' : 'Show PIN'"
                  >
                    {{ showStaffPin ? 'HIDE' : 'SHOW' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Parameters Row (Role & Status following latest button design) -->
            <div class="params-three-col-row staff-params-row">
              
              <!-- Role Option Pills -->
              <div class="param-column">
                <label class="param-col-title">Role</label>
                <div class="param-pills-wrap">
                  <button 
                    v-for="roleOpt in ['Staff Store', 'Supervisor', 'Super Admin']" 
                    :key="roleOpt"
                    type="button" 
                    class="figma-option-pill"
                    :class="{ 
                      'is-selected': staffForm.role === roleOpt,
                      'is-unselected': staffForm.role !== roleOpt
                    }"
                    @click="staffForm.role = roleOpt"
                  >
                    {{ roleOpt }}
                  </button>
                </div>
              </div>

              <!-- Shows in app / Account Status Segmented Toggle -->
              <div class="param-column">
                <label class="param-col-title">Account Status</label>
                <div class="figma-segmented-status-wrap">
                  <button 
                    type="button" 
                    class="figma-status-segment-btn"
                    :class="{ 'is-active': staffForm.status === 'Active' }"
                    @click="staffForm.status = 'Active'"
                  >
                    Active
                  </button>
                  <button 
                    type="button" 
                    class="figma-status-segment-btn"
                    :class="{ 'is-active': staffForm.status === 'Inactive' }"
                    @click="staffForm.status = 'Inactive'"
                  >
                    Inactive
                  </button>
                </div>
              </div>

            </div>

            <!-- Bottom Actions -->
            <div class="modal-bottom-actions-row" style="margin-top: 8px;">
              <button 
                type="button" 
                class="btn-figma-cancel"
                :disabled="isSavingStaff"
                @click="closeStaffModal"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn-figma-save"
                :disabled="isSavingStaff"
              >
                <span v-if="!isSavingStaff">{{ isEditStaffMode ? 'Save Account' : 'Add Staff' }}</span>
                <span v-else class="btn-spinner-inline">
                  <svg class="spinner-svg" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving to database...
                </span>
              </button>
            </div>

          </form>

        </div>
      </div>
    </Teleport>

    <!-- FLOATING TOAST NOTIFICATION -->
    <transition name="toast-pop">
      <div v-if="toastVisible" class="toast-notification" :class="{ 'toast-error': toastType === 'error' }">
        <div class="toast-icon">{{ toastType === 'error' ? '✕' : '✓' }}</div>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>
    </transition>

  </div>
</template>

<script setup>
import logoBlack from '../assets/images/logo-black.png';
import productStep1 from '../assets/images/product-step1.png';
import productStep2 from '../assets/images/product-step2.png';
import productIceflow from '../assets/images/product-iceflow-fastflow.png';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { clearAllClientStorage } from '../utils/storage.js';

const router = useRouter();
const isClearingOrders = ref(false);

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

// Loading and Toast Feedback State
const isLoadingProducts = ref(true);
const isLoadingStaff = ref(true);
const isSavingProduct = ref(false);
const isSavingStaff = ref(false);

const toastMessage = ref('');
const toastVisible = ref(false);
const toastType = ref('success');
let toastTimer = null;

function triggerToast(msg, type = 'success') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 3500);
}

// Clear all test orders and reset queue database to 0
async function clearTestOrders() {
  if (!confirm('Are you sure you want to clear all test orders and reset the queue to 0? This will wipe test queue data for store launch.')) {
    return;
  }
  isClearingOrders.value = true;
  try {
    const token = localStorage.getItem('stanley_staff_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/orders/clear', {
      method: 'POST',
      headers
    });
    if (res.ok) {
      clearAllClientStorage();
      triggerToast('All test orders cleared. Queue reset to 0.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } else {
      const err = await res.json().catch(() => ({}));
      triggerToast(err.error || 'Failed to clear orders from server', 'error');
    }
  } catch (e) {
    triggerToast('Network error while clearing test orders', 'error');
  } finally {
    isClearingOrders.value = false;
  }
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
  textTop: 48,
  textLeft: 50,
  textSize: 12,
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

// Master Product Catalog - Initialized empty to prevent flash of mock data
const products = ref([]);

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
  } catch (e) {
  } finally {
    isLoadingStaff.value = false;
  }

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
      if (Array.isArray(data)) {
        products.value = data;
        localStorage.setItem('stanley_product_catalog_order', JSON.stringify(data));
        return;
      }
    }
  } catch (e) {
  } finally {
    isLoadingProducts.value = false;
  }

  // Fallback to localStorage only if products are still empty
  if (products.value.length === 0) {
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
const placementCanvasRef = ref(null);
const adminPreviewOrientation = ref('Horizontal');
const isDraggingPlacement = ref(false);

function updatePlacementFromEvent(e) {
  if (!placementCanvasRef.value) return;
  const rect = placementCanvasRef.value.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  let leftPercent = ((clientX - rect.left) / rect.width) * 100;
  let topPercent = ((clientY - rect.top) / rect.height) * 100;
  
  // Clamp values within reasonable printable zone
  leftPercent = Math.max(20, Math.min(80, Math.round(leftPercent)));
  topPercent = Math.max(15, Math.min(85, Math.round(topPercent)));
  
  productForm.value.textLeft = leftPercent;
  productForm.value.textTop = topPercent;
}

function handlePlacementCanvasClick(e) {
  updatePlacementFromEvent(e);
}

function startPlacementDrag(e) {
  isDraggingPlacement.value = true;
  updatePlacementFromEvent(e);
  
  function onMove(moveEvent) {
    if (isDraggingPlacement.value) {
      updatePlacementFromEvent(moveEvent);
    }
  }
  
  function onUp() {
    isDraggingPlacement.value = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }
  
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function startPlacementTouch(e) {
  isDraggingPlacement.value = true;
  updatePlacementFromEvent(e);
  
  function onTouchMove(moveEvent) {
    if (isDraggingPlacement.value) {
      updatePlacementFromEvent(moveEvent);
    }
  }
  
  function onTouchEnd() {
    isDraggingPlacement.value = false;
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  }
  
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd);
}

function openAddProductModal() {
  isEditMode.value = false;
  isEditingSizes.value = false;
  adminPreviewOrientation.value = 'Horizontal';
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
    textTop: 48,
    textLeft: 50,
    textSize: 12,
    isActive: true
  };
  showProductModal.value = true;
}

function openEditProductModal(product) {
  isEditMode.value = true;
  isEditingSizes.value = false;
  adminPreviewOrientation.value = 'Horizontal';
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
    textTop: product.textTop !== undefined ? Number(product.textTop) : 48,
    textLeft: product.textLeft !== undefined ? Number(product.textLeft) : 50,
    textSize: product.textSize !== undefined ? Number(product.textSize) : 12,
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
async function saveProductForm() {
  if (!productForm.value.name.trim() || isSavingProduct.value) return;

  isSavingProduct.value = true;
  const fallbackImage = productForm.value.image || '/src/assets/images/machine-cup-1.png';
  const fallbackEngraved = productForm.value.engravedImage || '/src/assets/images/product-step2.png';
  const productName = productForm.value.name.trim();

  try {
    if (isEditMode.value) {
      const idx = products.value.findIndex(p => p.id === productForm.value.id);
      if (idx > -1) {
        products.value[idx] = {
          ...products.value[idx],
          name: productName,
          image: fallbackImage,
          engravedImage: fallbackEngraved,
          availableSizes: [...productForm.value.availableSizes],
          availablePositions: [...productForm.value.availablePositions],
          textTop: productForm.value.textTop !== undefined ? Number(productForm.value.textTop) : 48,
          textLeft: productForm.value.textLeft !== undefined ? Number(productForm.value.textLeft) : 50,
          textSize: productForm.value.textSize !== undefined ? Number(productForm.value.textSize) : 12,
          isActive: productForm.value.isActive
        };
      }
    } else {
      const newProd = {
        id: `prod-${Date.now()}`,
        name: productName,
        modelKey: productName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        image: fallbackImage,
        engravedImage: fallbackEngraved,
        availableSizes: [...productForm.value.availableSizes],
        availablePositions: [...productForm.value.availablePositions],
        textTop: productForm.value.textTop !== undefined ? Number(productForm.value.textTop) : 48,
        textLeft: productForm.value.textLeft !== undefined ? Number(productForm.value.textLeft) : 50,
        textSize: productForm.value.textSize !== undefined ? Number(productForm.value.textSize) : 12,
        defaultDuration: '03:45',
        maxChars: 7,
        isActive: productForm.value.isActive
      };
      products.value.push(newProd);
    }

    await persistProducts();
    triggerToast(isEditMode.value ? `✓ "${productName}" updated and synced to database` : `✓ "${productName}" added and synced to database`);
    showProductModal.value = false;
  } catch (err) {
    console.error('Failed to save product:', err);
    triggerToast('Failed to save product to server. Please try again.', 'error');
  } finally {
    isSavingProduct.value = false;
  }
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
  if (!staffForm.value.name.trim() || !staffForm.value.staffId.trim() || isSavingStaff.value) return;

  isSavingStaff.value = true;
  const cleanPin = (staffForm.value.pin || '').trim();
  const staffName = staffForm.value.name.trim();
  let targetUser = null;

  try {
    if (isEditStaffMode.value) {
      const idx = staffUsers.value.findIndex(u => u.id === staffForm.value.id);
      if (idx > -1) {
        staffUsers.value[idx] = {
          ...staffUsers.value[idx],
          staffId: staffForm.value.staffId.trim().toUpperCase(),
          idCode: staffForm.value.staffId.trim().toUpperCase(),
          name: staffName,
          username: staffForm.value.username.trim() || staffName,
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
        name: staffName,
        username: staffForm.value.username.trim() || staffName,
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
    }

    triggerToast(isEditStaffMode.value ? `✓ Staff "${staffName}" updated successfully` : `✓ Staff "${staffName}" added successfully`);
    showStaffModal.value = false;
  } catch (e) {
    console.error('Failed to sync staff user to backend:', e);
    triggerToast('Failed to save staff account to server. Please try again.', 'error');
  } finally {
    isSavingStaff.value = false;
  }
}

async function deleteStaff(user) {
  if (user.isDeveloper || user.username === 'devsosco01' || user.staffId === 'devsosco01' || user.id === 'devsosco01') {
    return; // Developer master account cannot be deleted
  }
  const confirmDelete = window.confirm(`Are you sure you want to delete staff "${user.name}" (${user.staffId || user.idCode})?`);
  if (!confirmDelete) return;
  const idx = staffUsers.value.findIndex(u => u.id === user.id);
  if (idx > -1) {
    const deletedName = user.name;
    staffUsers.value.splice(idx, 1);
    persistStaffUsers();

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
      triggerToast(`✓ Staff "${deletedName}" removed.`);
    } catch (e) {
      console.warn('Failed to delete staff user on server:', e);
    }
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

.clear-orders-btn {
  background-color: #FFFFFF;
  border: 1px solid #EF4444;
  border-radius: 8px;
  height: 40px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #DC2626;
  transition: all 0.15s ease;
}

.clear-orders-btn:hover:not(:disabled) {
  background-color: #FEF2F2;
  border-color: #DC2626;
}

.clear-orders-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* Product Modal (Figma 350:353) - Exact Pixel-Perfect & Fully Responsive */
.product-modal-card {
  background: #FFFFFF;
  border-radius: 8px;
  width: 100%;
  max-width: min(94vw, 763px);
  max-height: min(92vh, 92dvh);
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
  background: #FFFFFF;
}

.modal-title-bold {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.modal-close-icon-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #9CA3AF;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  border-radius: 4px;
  transition: color 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close-icon-btn:hover {
  color: #111827;
}

.modal-form-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
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

/* 2-Column Images & Controls Grid (Figma 351:441) */
.product-modal-images-row {
  display: flex;
  gap: 16px;
  width: 100%;
  align-items: stretch;
}

.product-image-box {
  width: 235px;
  flex-shrink: 0;
  background: #FAFAFA;
  border-radius: 8px;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 300px;
}

.product-engraved-box {
  flex: 1;
  min-width: 0;
  background: #FAFAFA;
  border-radius: 8px;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 300px;
}

.modal-section-label {
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  text-transform: capitalize;
  line-height: 15px;
}

.figma-upload-dropzone {
  border: 2px dashed #E2E8F0;
  border-radius: 16px;
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  padding: 8px;
}

.figma-upload-dropzone:hover {
  border-color: #94A3B8;
  background: #F1F5F9;
}

.figma-upload-dropzone.has-image {
  border-style: solid;
  border-color: #E2E8F0;
  background: #FFFFFF;
}

.upload-icon-circle-figma {
  background: #F1F5F9;
  border-radius: 12px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.upload-title-bold {
  font-size: 12px;
  font-weight: 700;
  color: #000000;
  text-align: center;
  line-height: 18px;
}

.upload-format-sub {
  font-size: 10px;
  color: #000000;
  line-height: 15px;
  margin-top: 2px;
  opacity: 0.8;
}

.hidden-file-input {
  display: none;
}

.figma-preview-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: 100%;
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
  z-index: 20;
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

/* Engraved Split Section inside Product Engraved Box */
.engraved-content-split {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
  width: 100%;
  align-items: stretch;
}

.engraved-dropzone {
  width: 203px;
  flex-shrink: 0;
  height: 100%;
  cursor: crosshair;
  user-select: none;
  touch-action: none;
}

.engraved-controls-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: opacity 0.2s ease;
}

.engraved-controls-column.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}

/* Orientation Tabs Pill (Figma 451:414) */
.orientation-tabs-pill {
  border: 0.5px solid #000000;
  border-radius: 8px;
  padding: 4px;
  display: flex;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
  background: #FFFFFF;
}

.orientation-tab-btn {
  flex: 1;
  height: 32px;
  border-radius: 8px;
  border: none;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #000000;
}

.orientation-tab-btn.is-active {
  background: #000000;
  color: #FFFFFF;
}

/* Sliders for Engraving Placement */
.engraved-slider-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.slider-figma-label {
  font-size: 8px;
  font-weight: 500;
  color: #000000;
  line-height: 12px;
}

.figma-sleek-slider {
  width: 100%;
  height: 3px;
  background: #D9D9D9;
  accent-color: #000000;
  cursor: pointer;
  outline: none;
  border-radius: 2px;
  border: none;
  -webkit-appearance: none;
}

.figma-sleek-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 4px;
  height: 9px;
  background: #000000;
  cursor: pointer;
  border-radius: 1px;
}

.figma-sleek-slider::-moz-range-thumb {
  width: 4px;
  height: 9px;
  background: #000000;
  cursor: pointer;
  border: none;
  border-radius: 1px;
}

.engraved-placement-hint {
  font-size: 10px;
  color: #000000;
  line-height: 15px;
  margin: 0;
  font-weight: 400;
}

/* Interactive Text Target Pin */
.interactive-text-pin {
  position: absolute;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.75);
  color: #FFFFFF;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px dashed #FFFFFF;
  font-family: var(--font-brand);
  font-weight: 700;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
  white-space: nowrap;
  pointer-events: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  z-index: 10;
}

.interactive-text-pin.is-vertical {
  transform: translate(-50%, -50%) rotate(-90deg);
}

.interactive-text-pin.is-dragging {
  cursor: grabbing;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4);
  border-color: #60A5FA;
}

/* Product Name Input */
.product-name-input-block {
  width: 100%;
  padding-top: 0;
}

.product-name-underline-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #000000;
  padding-bottom: 16px;
  font-size: 14px;
  color: #000000;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}

.product-name-underline-input::placeholder {
  color: #ABABAB;
}

/* Parameters Row */
.params-three-col-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
}

.param-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
}

.param-col-title {
  font-size: 14px;
  font-weight: 400;
  color: #000000;
  margin: 0;
  line-height: normal;
  white-space: nowrap;
}

.param-pills-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.figma-option-pill {
  border: 0.5px solid #000000;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  background: #FFFFFF;
  color: #000000;
  cursor: pointer;
  opacity: 1;
  transition: all 0.15s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.figma-option-pill.is-unselected {
  opacity: 0.45;
}

.figma-option-pill.is-selected {
  opacity: 1;
  font-weight: 500;
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

/* Shows in app Segmented Control (Figma 452:425) */
.figma-segmented-status-wrap {
  border: 0.5px solid #000000;
  border-radius: 8px;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0;
  box-sizing: border-box;
  background: #FFFFFF;
}

.figma-status-segment-btn {
  height: 32px;
  width: 96px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #000000;
}

.figma-status-segment-btn.is-active {
  background: #000000;
  color: #FFFFFF;
}

/* Bottom Actions */
.modal-bottom-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  flex-shrink: 0;
}

.btn-figma-cancel {
  flex: 1;
  height: 48px;
  border: 1px solid #000000;
  background: #FFFFFF;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  color: #000000;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-figma-cancel:hover {
  background-color: #F4F4F5;
}

.btn-figma-save {
  flex: 1;
  height: 48px;
  border: none;
  background: #000000;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  color: #FFFFFF;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-figma-save:hover {
  opacity: 0.85;
}

/* Responsive Overrides */
@media (max-width: 768px) {
  .product-modal-images-row {
    flex-direction: column;
  }
  
  .product-image-box,
  .product-engraved-box {
    width: 100%;
    height: auto;
    min-height: 280px;
  }

  .engraved-content-split {
    flex-direction: column;
    height: auto;
  }

  .engraved-dropzone {
    width: 100%;
    height: 200px;
  }

  .engraved-controls-column {
    gap: 12px;
  }

  .params-three-col-row {
    flex-direction: column;
    gap: 16px;
  }
}

/* Staff Modal Specific Styles */
.staff-modal-card {
  max-width: 680px;
  width: 92%;
  box-sizing: border-box;
}

.staff-modal-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
}

.custom-select-block {
  position: relative;
}

.select-underline-wrap {
  position: relative;
  width: 100%;
}

.staff-select-input {
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  padding-right: 28px;
  background: transparent;
}

.select-chevron-icon {
  position: absolute;
  right: 0;
  bottom: 16px;
  pointer-events: none;
  color: #52525B;
  display: flex;
  align-items: center;
}

.pin-input-wrap {
  position: relative;
  width: 100%;
}

.btn-pin-toggle {
  position: absolute;
  right: 0;
  bottom: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: #52525B;
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.15s ease;
}

.btn-pin-toggle:hover {
  color: #000000;
}

.staff-params-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
  padding-top: 4px;
}

@media (max-width: 640px) {
  .staff-modal-two-col {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .staff-params-row {
    flex-direction: column;
    gap: 16px;
  }
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

/* Inline Button Spinner */
.btn-spinner-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.spinner-svg {
  animation: spin 0.8s linear infinite;
  width: 15px;
  height: 15px;
}

.spinner-svg .opacity-25 {
  opacity: 0.25;
}

.spinner-svg .opacity-75 {
  opacity: 0.75;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Skeleton Loading Shimmer for Product Grid */
.product-config-card.is-skeleton {
  pointer-events: none;
  border-color: #E2E8F0;
  background: #FFFFFF;
}

.skeleton-shimmer {
  background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

.skeleton-thumb {
  width: 100%;
  aspect-ratio: 4 / 5;
  margin-bottom: 12px;
}

.skeleton-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-title {
  width: 70%;
  height: 16px;
}

.skeleton-tags {
  width: 90%;
  height: 24px;
}

.skeleton-btn {
  width: 100%;
  height: 36px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Floating Toast Notification */
.toast-notification {
  position: fixed;
  bottom: 32px;
  right: 32px;
  background: #18181B;
  color: #FFFFFF;
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 9999;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.toast-notification.toast-error {
  background: #7F1D1D;
  border-color: #991B1B;
}

.toast-icon {
  width: 22px;
  height: 22px;
  background: #10B981;
  color: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.toast-notification.toast-error .toast-icon {
  background: #EF4444;
}

.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-pop-enter-from,
.toast-pop-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.95);
}
</style>
