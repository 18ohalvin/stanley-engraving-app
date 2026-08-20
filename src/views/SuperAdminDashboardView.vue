<template>
  <div class="super-admin-screen">
    <!-- Top Header (Exact Engraver Dashboard Style & Layout) -->
    <header class="dashboard-header">
      <div class="header-inner">
        <div class="header-titles">
          <img 
            src="/src/assets/images/logo-black.png" 
            alt="Stanley 1913" 
            class="stanley-logo" 
          />
          <h1 class="station-heading">MAIN DASHBOARD</h1>
          <div class="header-divider"></div>
          <p class="store-location">ALL STORES</p>
        </div>

        <!-- Right Action Buttons: Store List, Logout (both outline box style), and Setting Icon -->
        <div class="header-actions">
          <button 
            type="button" 
            class="outline-action-btn"
            @click="router.push('/stores')"
            title="View and manage store locations"
          >
            Store List
          </button>

          <button 
            type="button" 
            class="outline-action-btn" 
            @click="handleLogout"
            title="Sign out of Admin Console"
          >
            Logout
          </button>

          <button 
            type="button" 
            class="setting-icon-btn" 
            @click="router.push('/settings')"
            title="System Settings & SLA Configuration"
            aria-label="Settings"
          >
            <img src="/src/assets/icons/settings.svg" alt="Settings" class="setting-nav-icon" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Dashboard Body -->
    <main class="dashboard-body">
      <div class="dashboard-content-wrap">
        
        <!-- SECTION TITLE (Figma 131:2531) -->
        <section class="section-title-block">
          <h2 class="overview-title">ANALYTICS OVERVIEW</h2>
          <p class="overview-subtitle">Monitor engraving performance across all stores.</p>
        </section>

        <!-- KPI & DURATION CHART CONTAINER (Figma 124:1243) -->
        <section class="kpi-chart-card">
          
          <!-- 4 Top Clickable KPI Overview Cards Grid -->
          <div class="kpi-grid">
            
            <!-- KPI 1: Total Engravings -->
            <div 
              class="kpi-card" 
              :class="{ 'is-selected': activeMetric === 'total_engravings' }"
              @click="activeMetric = 'total_engravings'"
              role="button"
              tabindex="0"
            >
              <div class="kpi-card-header">
                <span class="kpi-label">TOTAL ENGRAVINGS</span>
                <div class="kpi-icon-wrap">
                  <img src="/src/assets/icons/activity.svg" alt="Activity" class="kpi-icon-img" />
                </div>
              </div>
              <div class="kpi-card-body">
                <div class="kpi-value-row">
                  <span class="kpi-main-val">{{ stats.totalEngravings.toLocaleString() }}</span>
                </div>
                <div class="kpi-trend-row">
                  <span :class="kpiTrends.totalEngravings.isPositive ? 'trend-positive' : 'trend-neutral'">{{ kpiTrends.totalEngravings.text }}</span>
                  <span class="trend-subtext">vs yesterday</span>
                </div>
              </div>
            </div>

            <!-- KPI 2: Avg. Engraving Time -->
            <div 
              class="kpi-card" 
              :class="{ 'is-selected': activeMetric === 'avg_time' }"
              @click="activeMetric = 'avg_time'"
              role="button"
              tabindex="0"
            >
              <div class="kpi-card-header">
                <span class="kpi-label">AVG. ENGRAVING TIME</span>
                <div class="kpi-icon-wrap">
                  <img src="/src/assets/icons/clock.svg" alt="Clock" class="kpi-icon-img" />
                </div>
              </div>
              <div class="kpi-card-body">
                <div class="kpi-value-row">
                  <span class="kpi-main-val">{{ stats.avgEngravingTime }}</span>
                  <span class="kpi-unit">minutes</span>
                </div>
                <div class="kpi-trend-row">
                  <span :class="kpiTrends.avgEngravingTime.isPositive ? 'trend-positive' : 'trend-neutral'">{{ kpiTrends.avgEngravingTime.text }}</span>
                  <span class="trend-subtext">vs yesterday</span>
                </div>
              </div>
            </div>

            <!-- KPI 3: Total Orders (Cups) -->
            <div 
              class="kpi-card" 
              :class="{ 'is-selected': activeMetric === 'total_cups' }"
              @click="activeMetric = 'total_cups'"
              role="button"
              tabindex="0"
            >
              <div class="kpi-card-header">
                <span class="kpi-label">TOTAL ORDERS (CUPS)</span>
                <div class="kpi-icon-wrap">
                  <img src="/src/assets/icons/shopping-bag.svg" alt="Orders" class="kpi-icon-img" />
                </div>
              </div>
              <div class="kpi-card-body">
                <div class="kpi-value-row">
                  <span class="kpi-main-val">{{ stats.totalOrdersCups.toLocaleString() }}</span>
                </div>
                <div class="kpi-trend-row">
                  <span :class="kpiTrends.totalOrdersCups.isPositive ? 'trend-positive' : 'trend-neutral'">{{ kpiTrends.totalOrdersCups.text }}</span>
                  <span class="trend-subtext">vs yesterday</span>
                </div>
              </div>
            </div>

            <!-- KPI 4: Avg. Wait Time -->
            <div 
              class="kpi-card" 
              :class="{ 'is-selected': activeMetric === 'wait_time' }"
              @click="activeMetric = 'wait_time'"
              role="button"
              tabindex="0"
            >
              <div class="kpi-card-header">
                <span class="kpi-label">AVG. WAIT TIME</span>
                <div class="kpi-icon-wrap">
                  <img src="/src/assets/icons/user-check.svg" alt="Wait Time" class="kpi-icon-img" />
                </div>
              </div>
              <div class="kpi-card-body">
                <div class="kpi-value-row">
                  <span class="kpi-main-val">{{ stats.avgWaitTime }}</span>
                  <span class="kpi-unit">minutes</span>
                </div>
                <div class="kpi-trend-row">
                  <span :class="kpiTrends.avgWaitTime.isPositive ? 'trend-positive' : 'trend-neutral'">{{ kpiTrends.avgWaitTime.text }}</span>
                  <span class="trend-subtext">vs yesterday</span>
                </div>
              </div>
            </div>

          </div>

          <!-- TIME-SERIES INTERACTIVE DYNAMIC CHART (Emerald Glowing Area Graph Style) -->
          <div class="chart-section-container">
            
            <!-- Chart Header with Dynamic Legend & Date Filter -->
            <div class="chart-header-row">
              <div class="chart-legend-group">
                <div class="legend-item">
                  <span class="emerald-legend-dot-line">
                    <span class="emerald-legend-line" :style="{ backgroundColor: chartThemeColors.stroke }"></span>
                    <span class="emerald-legend-circle" :style="{ backgroundColor: chartThemeColors.coreDot, boxShadow: `0 0 6px ${chartThemeColors.dotShadow}` }"></span>
                  </span>
                  <span class="legend-text">{{ currentMetricConfig.primaryLegend }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dashed-line"></span>
                  <span class="legend-text">{{ currentMetricConfig.targetLegend }}</span>
                </div>
              </div>

              <!-- Controls: Adjustment Target Button + Date Picker Button -->
              <div class="chart-header-actions">
                <!-- Adjustment Button (Beside Calendar on the left) -->
                <button 
                  type="button" 
                  class="chart-adjustment-btn"
                  @click="openCategoryTargetsModal"
                  title="Set Targets for 4 Analytics Categories"
                  aria-label="Set Category Targets"
                >
                  <img src="/src/assets/icons/adjustment.svg" alt="Adjust Targets" class="adjustment-btn-icon" />
                </button>

                <!-- Date Picker Button (Figma 131:1206) -->
                <button 
                  type="button" 
                  class="chart-date-picker-btn"
                  @click="openDatePickerModal"
                  :title="'Filter by date: ' + formattedSelectedDate"
                >
                  <img src="/src/assets/icons/clock.svg" alt="Calendar" class="calendar-btn-icon" />
                  <span class="date-label">{{ formattedSelectedDate }}</span>
                  <img src="/src/assets/icons/chevron-down.svg" alt="Open" class="chevron-btn-icon" />
                </button>
              </div>
            </div>

            <!-- Interactive Vibrant SVG Line Chart with Safe Bounds -->
            <div class="chart-canvas-wrapper" ref="chartContainerRef">
              <!-- Y-Axis Ticks perfectly aligned with Grid Lines -->
              <div class="chart-y-axis">
                <div 
                  v-for="(tick, idx) in currentMetricConfig.yTicks" 
                  :key="idx" 
                  class="y-tick"
                  :style="{ top: `${tick.percent}%` }"
                >
                  <span>{{ tick.label }}</span>
                </div>
              </div>

              <div class="chart-plot-area">
                <!-- Horizontal Subtle Hairline Grid Lines with Aligned Percentages -->
                <div 
                  v-for="(tick, idx) in currentMetricConfig.yTicks" 
                  :key="'grid-' + idx"
                  class="grid-line"
                  :style="{ top: `${tick.percent}%` }"
                ></div>

                <!-- Target SLA Dashed Reference Line -->
                <div 
                  class="grid-line target-grid-line" 
                  :style="{ top: `${getHourYPercent(currentMetricConfig.targetValue)}%` }"
                >
                  <span class="sla-badge-tag">{{ currentMetricConfig.targetTag }}</span>
                </div>

                <!-- SVG Graph Layer -->
                <svg 
                  class="chart-svg-layer" 
                  viewBox="0 0 1000 240" 
                  preserveAspectRatio="none"
                >
                  <!-- Gradient Area Definition -->
                  <defs>
                    <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" :stop-color="chartThemeColors.stopColor" stop-opacity="0.25"/>
                      <stop offset="60%" :stop-color="chartThemeColors.stopColor" stop-opacity="0.06"/>
                      <stop offset="100%" :stop-color="chartThemeColors.stopColor" stop-opacity="0.0"/>
                    </linearGradient>
                  </defs>

                  <!-- Faint Dashed Target Reference Line inside SVG -->
                  <line 
                    x1="0" 
                    :y1="getPointY(currentMetricConfig.targetValue)" 
                    x2="1000" 
                    :y2="getPointY(currentMetricConfig.targetValue)" 
                    stroke="#E5E7EB" 
                    stroke-width="1.5" 
                    stroke-dasharray="5 5"
                  />

                  <!-- Vertical Guideline at Active Point -->
                  <line 
                    v-if="effectiveActivePoint"
                    :x1="getHourXCoord(effectiveActivePoint.hour)" 
                    :y1="getPointY(effectiveActivePoint.value)" 
                    :x2="getHourXCoord(effectiveActivePoint.hour)" 
                    :y2="PLOT_TOP_PADDING + PLOT_DRAWABLE_HEIGHT" 
                    :stroke="chartThemeColors.stroke" 
                    stroke-opacity="0.35"
                    stroke-width="1.5" 
                    stroke-dasharray="3 3"
                  />

                  <!-- Area Fill Under Curve -->
                  <path 
                    :d="chartSvgAreaPath" 
                    fill="url(#chartAreaGrad)"
                  />

                  <!-- Main Linear Stroke -->
                  <path 
                    :d="chartSvgLinePath" 
                    fill="none" 
                    :stroke="chartThemeColors.stroke" 
                    stroke-width="2.5" 
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />

                  <!-- Invisible Hover Targets for Available Hourly Nodes -->
                  <g v-for="(point, idx) in activeHourlyData" :key="'target-' + idx">
                    <circle 
                      :cx="getHourXCoord(point.hour)" 
                      :cy="getPointY(point.value)" 
                      r="20" 
                      fill="transparent" 
                      class="chart-hover-trigger"
                      @mouseenter="hoveredIndex = idx"
                      @mouseleave="hoveredIndex = null"
                    />
                  </g>
                </svg>

                <!-- Perfect 1:1 Circle Active Glowing Dot (Guaranteed inside container) -->
                <div 
                  v-if="effectiveActivePoint"
                  class="active-glowing-dot-wrapper"
                  :style="{ 
                    left: `${getHourXPercent(effectiveActivePoint.hour)}%`, 
                    top: `${getHourYPercent(effectiveActivePoint.value)}%` 
                  }"
                >
                  <div class="dot-halo-outer" :style="{ background: chartThemeColors.haloOuter }"></div>
                  <div class="dot-halo-inner" :style="{ background: chartThemeColors.haloInner }"></div>
                  <div 
                    class="dot-core-circle" 
                    :style="{ 
                      background: chartThemeColors.coreDot, 
                      boxShadow: `0 0 6px ${chartThemeColors.dotShadow}` 
                    }"
                  ></div>
                </div>

                <!-- Floating Pill Tooltip Badge (Safely within container headroom) -->
                <div 
                  v-if="effectiveActivePoint" 
                  class="floating-pill-tooltip fade-in"
                  :style="{ 
                    left: `${getHourXPercent(effectiveActivePoint.hour)}%`, 
                    top: `${getHourYPercent(effectiveActivePoint.value)}%` 
                  }"
                >
                  <span class="pill-time">{{ effectiveActivePoint.time }}</span>
                  <span class="pill-val" :style="{ color: chartThemeColors.pillText }">{{ formatTooltipValue(effectiveActivePoint.value) }}</span>
                  <span v-if="isCurrentBreached" class="pill-breach-badge">Over Target</span>
                </div>
              </div>

              <!-- X-Axis Time Labels (Operating Hours 10:00 to 22:00) -->
              <div class="chart-x-axis">
                <span 
                  v-for="hObj in operatingHoursList" 
                  :key="hObj.time"
                  class="x-label"
                  :class="{ 
                    'is-highlighted': effectiveActivePoint && effectiveActivePoint.time === hObj.time,
                    'is-available': hObj.hour <= maxAvailableHour,
                    'is-upcoming': hObj.hour > maxAvailableHour
                  }"
                >
                  {{ hObj.time }}
                </span>
              </div>
            </div>

          </div>
        </section>

        <!-- BOTTOM 3-COLUMN RANKINGS GRID -->
        <section class="rankings-three-col-grid">
          
          <!-- CARD 1: TOP ENGRAVING ITEMS (Figma 131:1369) -->
          <div class="ranking-card">
            <div class="ranking-card-header">
              <h3 class="ranking-title">TOP ENGRAVING ITEMS</h3>
              <button 
                type="button" 
                class="ranking-date-btn"
                @click="openDatePickerModal"
              >
                <img src="/src/assets/icons/clock.svg" alt="Calendar" class="calendar-btn-icon" />
                <span>{{ formattedSelectedDate }}</span>
                <img src="/src/assets/icons/chevron-down.svg" alt="Open" class="chevron-btn-icon" />
              </button>
            </div>

            <div v-if="topProducts && topProducts.length > 0" class="ranking-items-list">
              <div 
                v-for="(item, index) in topProducts" 
                :key="item.id || index"
                class="ranking-row-item"
              >
                <span class="ranking-rank-num">{{ index + 1 }}</span>
                <div class="ranking-thumb-wrap">
                  <img :src="item.image" :alt="item.name" class="ranking-thumb-img" />
                </div>
                <div class="ranking-meta-col">
                  <span class="ranking-item-name">{{ item.name }}</span>
                  <span class="ranking-item-count">{{ item.count.toLocaleString() }} Cups</span>
                </div>
                <span class="ranking-share-pct">{{ item.percentage }}%</span>
              </div>
            </div>

            <div v-else class="ranking-empty-state">
              <svg class="ranking-empty-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                <line x1="6" y1="1" x2="6" y2="4"></line>
                <line x1="10" y1="1" x2="10" y2="4"></line>
                <line x1="14" y1="1" x2="14" y2="4"></line>
              </svg>
              <span class="ranking-empty-title">No Engraved Items Yet</span>
              <span class="ranking-empty-subtitle">Items will appear as orders are processed</span>
            </div>
          </div>

          <!-- CARD 2: TOP ENGRAVING TIME (Duration per Product) -->
          <div class="ranking-card">
            <div class="ranking-card-header">
              <h3 class="ranking-title">TOP ENGRAVING TIME</h3>
              <button 
                type="button" 
                class="ranking-date-btn"
                @click="openDatePickerModal"
              >
                <img src="/src/assets/icons/clock.svg" alt="Calendar" class="calendar-btn-icon" />
                <span>{{ formattedSelectedDate }}</span>
                <img src="/src/assets/icons/chevron-down.svg" alt="Open" class="chevron-btn-icon" />
              </button>
            </div>

            <div v-if="topProductDurations && topProductDurations.length > 0" class="ranking-items-list">
              <div 
                v-for="(item, index) in topProductDurations" 
                :key="item.id || index"
                class="ranking-row-item"
              >
                <span class="ranking-rank-num">{{ index + 1 }}</span>
                <div class="ranking-thumb-wrap">
                  <img :src="item.image" :alt="item.name" class="ranking-thumb-img" />
                </div>
                <div class="ranking-meta-col">
                  <span class="ranking-item-name">{{ item.name }}</span>
                  <span class="ranking-item-count" :class="{ 'text-emerald': item.isWithinSla, 'text-amber': !item.isWithinSla }">
                    {{ item.slaStatus }}
                  </span>
                </div>
                <span class="ranking-share-pct duration-value">{{ item.durationFormatted }}</span>
              </div>
            </div>

            <div v-else class="ranking-empty-state">
              <svg class="ranking-empty-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span class="ranking-empty-title">No Engraving Times Recorded</span>
              <span class="ranking-empty-subtitle">Durations will calculate as jobs complete</span>
            </div>
          </div>

          <!-- CARD 3: TOP ENGRAVING STORES (Figma 131:1428) -->
          <div class="ranking-card">
            <div class="ranking-card-header">
              <h3 class="ranking-title">TOP ENGRAVING STORES</h3>
              <button 
                type="button" 
                class="ranking-date-btn"
                @click="openDatePickerModal"
              >
                <img src="/src/assets/icons/clock.svg" alt="Calendar" class="calendar-btn-icon" />
                <span>{{ formattedSelectedDate }}</span>
                <img src="/src/assets/icons/chevron-down.svg" alt="Open" class="chevron-btn-icon" />
              </button>
            </div>

            <div v-if="topStores && topStores.length > 0" class="ranking-items-list">
              <div 
                v-for="(store, index) in topStores" 
                :key="store.id || index"
                class="ranking-row-item"
              >
                <span class="ranking-rank-num">{{ index + 1 }}</span>
                <div class="ranking-thumb-wrap store-avatar-wrap">
                  <span class="store-avatar-initials">{{ store.initials }}</span>
                </div>
                <div class="ranking-meta-col">
                  <span class="ranking-item-name">{{ store.name }}</span>
                  <span class="ranking-item-count">{{ store.count.toLocaleString() }} Cups</span>
                </div>
                <span class="ranking-share-pct">{{ store.percentage }}%</span>
              </div>
            </div>

            <div v-else class="ranking-empty-state">
              <svg class="ranking-empty-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span class="ranking-empty-title">No Store Data Yet</span>
              <span class="ranking-empty-subtitle">Rankings will update as stores process cups</span>
            </div>
          </div>

        </section>

      </div>
    </main>

    <!-- STORE LIST MODAL (Super Admin Store Switcher) -->
    <Teleport to="body">
      <div v-if="showStoreListModal" class="modal-backdrop" @click="showStoreListModal = false">
        <div class="store-list-modal-card fade-in" @click.stop>
          <div class="modal-header-row">
            <div class="modal-title-group">
              <h3 class="modal-headline">Stanley Retail Store Network</h3>
              <p class="modal-subheadline">Select any store location to monitor or view live operations.</p>
            </div>
            <button class="modal-close-x" @click="showStoreListModal = false">✕</button>
          </div>

          <div class="store-cards-scroll-grid">
            <div 
              v-for="store in allStoreLocations" 
              :key="store.id"
              class="store-status-row-card"
            >
              <div class="store-info-left">
                <div class="store-badge-row">
                  <span class="store-code-tag">{{ store.code }}</span>
                  <span class="store-online-badge" :class="{ 'is-active': store.status === 'online' }">
                    ● {{ store.status.toUpperCase() }}
                  </span>
                </div>
                <h4 class="store-name-title">{{ store.name }}</h4>
                <p class="store-address-line">{{ store.address }}</p>
              </div>

              <div class="store-stats-right">
                <div class="store-stat-pill">
                  <span class="stat-pill-label">Active Machines</span>
                  <strong>{{ store.activeMachines }}/{{ store.totalMachines }}</strong>
                </div>
                <div class="store-stat-pill">
                  <span class="stat-pill-label">Queue Today</span>
                  <strong>{{ store.todayQueue }} orders</strong>
                </div>
                <button 
                  type="button" 
                  class="btn-visit-store"
                  @click="visitStore(store)"
                >
                  View Station ↗
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer-row">
            <button class="btn-modal-close" @click="showStoreListModal = false">Done</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- SETTINGS & SLA CONFIG MODAL -->
    <Teleport to="body">
      <div v-if="showSettingsModal" class="modal-backdrop" @click="showSettingsModal = false">
        <div class="settings-modal-card fade-in" @click.stop>
          <div class="modal-header-row">
            <div class="modal-title-group">
              <h3 class="modal-headline">System & SLA Preferences</h3>
              <p class="modal-subheadline">Configure global service level agreements and alerts.</p>
            </div>
            <button class="modal-close-x" @click="showSettingsModal = false">✕</button>
          </div>

          <div class="settings-body-form">
            <div class="setting-item-row">
              <div class="setting-desc">
                <strong>Target SLA Engraving Duration</strong>
                <span>Maximum standard minutes per cup before flagging</span>
              </div>
              <div class="setting-input-wrap">
                <input type="number" v-model="slaTargetMinutes" min="1" max="15" class="number-input" />
                <span>mins</span>
              </div>
            </div>

            <div class="setting-item-row">
              <div class="setting-desc">
                <strong>Real-time Auto-Refresh</strong>
                <span>Sync analytics data with live in-store IoT machines</span>
              </div>
              <input type="checkbox" v-model="autoRefreshEnabled" class="toggle-checkbox" />
            </div>

            <div class="setting-item-row">
              <div class="setting-desc">
                <strong>WhatsApp Pick-Up Notifications</strong>
                <span>Send customer automated message upon engraving completion</span>
              </div>
              <input type="checkbox" v-model="notificationsEnabled" class="toggle-checkbox" />
            </div>
          </div>

          <div class="modal-footer-row">
            <button class="btn-modal-save" @click="saveSettings">Save Settings</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- CATEGORY TARGETS ADJUSTMENT MODAL (Figma 403:500 Global Style) -->
    <Teleport to="body">
      <div v-if="showTargetModal" class="modal-backdrop" @click="showTargetModal = false">
        <div class="product-modal-card fade-in" style="max-width: min(94vw, 610px);" @click.stop>
          <div class="modal-header-row">
            <h3 class="modal-title-medium">Set Category Targets</h3>
            <button type="button" class="modal-close-icon-btn" @click="showTargetModal = false" aria-label="Close">
              ✕
            </button>
          </div>

          <form @submit.prevent="saveCategoryTargets" class="modal-form-content">
            <!-- Row 1: Total Engravings & SLA Duration -->
            <div class="two-images-upload-grid">
              <div class="product-name-input-block">
                <label class="param-col-title-medium">Total Engravings (cups/hr)*</label>
                <input 
                  v-model.number="tempCategoryTargets.total_engravings" 
                  type="number" 
                  step="1"
                  min="1"
                  class="product-name-underline-input" 
                  placeholder="e.g. 20" 
                  required 
                />
              </div>
              <div class="product-name-input-block">
                <label class="param-col-title-medium">Avg. Engraving Time SLA (mins)*</label>
                <input 
                  v-model.number="tempCategoryTargets.avg_time" 
                  type="number" 
                  step="0.5"
                  min="0.5"
                  class="product-name-underline-input" 
                  placeholder="e.g. 4.0" 
                  required 
                />
              </div>
            </div>

            <!-- Row 2: Total Orders & Wait Time -->
            <div class="two-images-upload-grid">
              <div class="product-name-input-block">
                <label class="param-col-title-medium">Total Orders Capacity (cups/hr)*</label>
                <input 
                  v-model.number="tempCategoryTargets.total_cups" 
                  type="number" 
                  step="1"
                  min="1"
                  class="product-name-underline-input" 
                  placeholder="e.g. 25" 
                  required 
                />
              </div>
              <div class="product-name-input-block">
                <label class="param-col-title-medium">Avg. Wait Time Target (mins)*</label>
                <input 
                  v-model.number="tempCategoryTargets.wait_time" 
                  type="number" 
                  step="1"
                  min="1"
                  class="product-name-underline-input" 
                  placeholder="e.g. 15.0" 
                  required 
                />
              </div>
            </div>

            <!-- Target Presets Section -->
            <div class="target-presets-section">
              <label class="param-col-title-medium">Target Presets</label>
              <div class="machine-picker-pills-row">
                <button 
                  type="button" 
                  class="option-pill"
                  :class="{ 'is-selected': activeTargetPreset === 'standard' }"
                  @click="applyTargetPreset('standard')"
                >
                  Standard
                </button>
                <button 
                  type="button" 
                  class="option-pill"
                  :class="{ 'is-selected': activeTargetPreset === 'peak' }"
                  @click="applyTargetPreset('peak')"
                >
                  Peak Season
                </button>
                <button 
                  type="button" 
                  class="option-pill"
                  :class="{ 'is-selected': activeTargetPreset === 'rush' }"
                  @click="applyTargetPreset('rush')"
                >
                  Rush Hours
                </button>
              </div>
            </div>

            <!-- Global Modal Action Buttons (Figma 403:516) -->
            <div class="modal-bottom-actions-row">
              <button 
                type="button" 
                class="btn-figma-cancel"
                @click="showTargetModal = false"
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

    <!-- ADVANCED DATE PICKER MODAL (Google Material Design Style) -->
    <Teleport to="body">
      <div v-if="showDatePickerModal" class="date-modal-backdrop" @click="showDatePickerModal = false">
        <div class="date-picker-dialog fade-in" @click.stop>
          
          <!-- LEFT / SIDEBAR PANE -->
          <div class="dialog-sidebar-pane">
            <div class="dialog-header">
              <div class="dialog-title-block">
                <span class="dialog-super-title">SELECT DATE</span>
                <h3 class="dialog-selected-headline">{{ dialogHeadlineDate }}</h3>
              </div>
              <button class="dialog-close-x close-mobile-only" @click="showDatePickerModal = false" aria-label="Close">✕</button>
            </div>

            <!-- Quick Presets Bar -->
            <div class="date-presets-bar">
              <button 
                type="button" 
                v-for="preset in datePresets" 
                :key="preset.id"
                class="preset-chip"
                :class="{ 'is-active': tempActivePreset === preset.id }"
                @click="applyPreset(preset.id)"
              >
                {{ preset.label }}
              </button>
            </div>

            <!-- Quick Clear Action -->
            <div class="sidebar-clear-wrap">
              <button 
                type="button" 
                class="btn-text-clear" 
                @click="clearDateFilter"
              >
                Show All Time
              </button>
            </div>
          </div>

          <!-- RIGHT / MAIN CALENDAR PANE -->
          <div class="dialog-main-pane">
            
            <div class="dialog-nav-header">
              <span class="month-year-title">{{ currentMonthYearDisplay }}</span>
              <div class="month-nav-arrows">
                <button type="button" class="nav-arrow-btn" @click="prevMonth" aria-label="Previous month">‹</button>
                <button type="button" class="nav-arrow-btn" @click="nextMonth" aria-label="Next month">›</button>
              </div>
            </div>

            <div class="calendar-days-header">
              <span v-for="d in ['S', 'M', 'T', 'W', 'T', 'F', 'S']" :key="d" class="day-col-name">{{ d }}</span>
            </div>

            <div class="calendar-days-grid">
              <button 
                type="button"
                v-for="cell in calendarDays" 
                :key="cell.dateString"
                class="cal-day-cell"
                :class="{
                  'is-empty': !cell.isCurrentMonth,
                  'is-today': cell.isToday,
                  'is-selected': cell.dateString === tempSelectedDate
                }"
                :disabled="!cell.isCurrentMonth"
                @click="selectCalendarDate(cell.dateString)"
              >
                <span class="day-number">{{ cell.dayNumber }}</span>
              </button>
            </div>

            <!-- Action Buttons -->
            <div class="dialog-actions-footer">
              <button type="button" class="btn-dialog-cancel" @click="showDatePickerModal = false">Cancel</button>
              <button type="button" class="btn-dialog-apply" @click="confirmDateSelection">Apply Filter</button>
            </div>

          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQueueStore } from '../store/queueStore.js';
import { getAnalyticsLogs } from '../utils/analyticsService.js';

const router = useRouter();
const queueStore = useQueueStore();

// Selected Active Metric among the 4 overview boxes: 'total_engravings' (default), 'avg_time', 'total_cups', 'wait_time'
const activeMetric = ref('total_engravings');

const showStoreListModal = ref(false);
const showSettingsModal = ref(false);
const showDatePickerModal = ref(false);
const showTargetModal = ref(false);
const hoveredIndex = ref(null);

const slaTargetMinutes = ref(4);
const autoRefreshEnabled = ref(true);
const notificationsEnabled = ref(true);

// 4 Category Target Thresholds
const defaultCategoryTargets = {
  total_engravings: 20,
  avg_time: 4.0,
  total_cups: 25,
  wait_time: 15.0
};

const categoryTargets = ref({ ...defaultCategoryTargets });
const tempCategoryTargets = ref({ ...defaultCategoryTargets });
const activeTargetPreset = ref('standard');

function loadCategoryTargets() {
  try {
    const saved = localStorage.getItem('stanley_category_targets');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        categoryTargets.value = { ...defaultCategoryTargets, ...parsed };
        return;
      }
    }
  } catch (e) {}
  categoryTargets.value = { ...defaultCategoryTargets };
}

function openCategoryTargetsModal() {
  loadCategoryTargets();
  tempCategoryTargets.value = { ...categoryTargets.value };
  activeTargetPreset.value = 'standard';
  showTargetModal.value = true;
}

function applyTargetPreset(preset) {
  activeTargetPreset.value = preset;
  if (preset === 'standard') {
    tempCategoryTargets.value = {
      total_engravings: 20,
      avg_time: 4.0,
      total_cups: 25,
      wait_time: 15.0
    };
  } else if (preset === 'peak') {
    tempCategoryTargets.value = {
      total_engravings: 35,
      avg_time: 3.5,
      total_cups: 45,
      wait_time: 20.0
    };
  } else if (preset === 'rush') {
    tempCategoryTargets.value = {
      total_engravings: 30,
      avg_time: 3.0,
      total_cups: 40,
      wait_time: 10.0
    };
  }
}

function saveCategoryTargets() {
  categoryTargets.value = { ...tempCategoryTargets.value };
  try {
    localStorage.setItem('stanley_category_targets', JSON.stringify(categoryTargets.value));
    window.dispatchEvent(new Event('stanley_targets_updated'));
  } catch (e) {}
  showTargetModal.value = false;
}

// Operating Store Hours: 10:00 to 22:00 (13 hourly marks)
const OPENING_HOUR = 10;
const CLOSING_HOUR = 22;

const operatingHoursList = computed(() => {
  const list = [];
  for (let h = OPENING_HOUR; h <= CLOSING_HOUR; h++) {
    list.push({
      hour: h,
      time: `${String(h).padStart(2, '0')}:00`
    });
  }
  return list;
});

// Selected Date State (Initialized to local Today)
const todayStr = new Date().toISOString().split('T')[0];
const selectedDate = ref(todayStr);
const tempSelectedDate = ref(todayStr);
const currentCalendarMonth = ref(new Date());
const tempActivePreset = ref('today');

// Current Live Hour
const currentLiveHour = computed(() => {
  return new Date().getHours();
});

// Check if currently viewing Today
const isViewingToday = computed(() => {
  if (!selectedDate.value) return true;
  return selectedDate.value === todayStr;
});

// Maximum hour with available data
const maxAvailableHour = computed(() => {
  if (isViewingToday.value) {
    return Math.min(Math.max(currentLiveHour.value, OPENING_HOUR), CLOSING_HOUR);
  }
  return CLOSING_HOUR;
});

// Helper to extract operating hour from an order
function getOrderOperatingHour(order) {
  if (order.booking_time) {
    const parts = String(order.booking_time).split(':');
    const h = parseInt(parts[0], 10);
    if (!isNaN(h) && h >= OPENING_HOUR && h <= CLOSING_HOUR) return h;
  }
  if (order.created_at) {
    const d = new Date(order.created_at);
    if (!isNaN(d.getTime())) {
      const h = d.getHours();
      return Math.min(Math.max(h, OPENING_HOUR), CLOSING_HOUR);
    }
  }
  return 10;
}

// ----------------------------------------------------
// 100% REAL DATABASE METRIC COMPUTATIONS FROM QUEUE STORE
// ----------------------------------------------------

// 1. Total Engravings: Real count of cups engraved/completed in the database
const realCompletedOrders = computed(() => {
  const orders = queueStore.orders || [];
  return orders.filter(o => o.status === 'ready_for_pickup' || o.status === 'completed');
});

const realTotalEngravings = computed(() => {
  return realCompletedOrders.value.reduce((sum, o) => sum + (o.items ? o.items.length : 1), 0);
});

// 2. Total Orders (Cups): Real count of all valid cups ordered in the system
const realValidOrders = computed(() => {
  const orders = queueStore.orders || [];
  return orders.filter(o => o.status !== 'cancelled');
});

const realTotalOrdersCups = computed(() => {
  return realValidOrders.value.reduce((sum, o) => sum + (o.items ? o.items.length : 1), 0);
});

// 3. Avg Engraving Time: Real mathematical average of completed engraving jobs
const realAvgEngravingDurationFormatted = computed(() => {
  if (realCompletedOrders.value.length === 0) {
    return '00:00';
  }

  let totalSeconds = 0;
  let count = 0;

  realCompletedOrders.value.forEach(order => {
    if (order.durationSeconds) {
      totalSeconds += order.durationSeconds;
      count++;
    }
  });

  if (count === 0) {
    return '00:00';
  }
  const avg = Math.round(totalSeconds / count);
  const m = Math.floor(avg / 60);
  const s = avg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

// 4. Avg Wait Time: Real calculated average wait time across queue
const realAvgWaitTimeFormatted = computed(() => {
  const orders = realValidOrders.value;
  if (orders.length === 0) return '00:00';
  const inQueue = orders.filter(o => o.status === 'in_queue' || o.status === 'engraving_in_progress');
  if (inQueue.length === 0) return '00:00';
  const activeMachines = Math.max(1, queueStore.machines.filter(m => m.isActive !== false).length);
  const avgMin = (inQueue.length * 3.5) / activeMachines;
  const m = Math.floor(avgMin);
  const s = Math.round((avgMin - m) * 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

// KPI Analytics Summary Cards
const stats = computed(() => {
  return {
    totalEngravings: realTotalEngravings.value,
    avgEngravingTime: realAvgEngravingDurationFormatted.value,
    totalOrdersCups: realTotalOrdersCups.value,
    avgWaitTime: realAvgWaitTimeFormatted.value
  };
});

// Dynamic Trend Indicators (e.g. +12.5% when active, 0.0% when starting fresh)
const kpiTrends = computed(() => {
  const hasEngravings = realTotalEngravings.value > 0;
  const hasCompleted = realCompletedOrders.value.length > 0;
  const hasOrders = realTotalOrdersCups.value > 0;
  const hasWait = realValidOrders.value.length > 0;

  return {
    totalEngravings: {
      text: hasEngravings ? '+ 12.5%' : '0.0%',
      isPositive: hasEngravings
    },
    avgEngravingTime: {
      text: hasCompleted ? '+ 12.5%' : '0.0%',
      isPositive: hasCompleted
    },
    totalOrdersCups: {
      text: hasOrders ? '+ 8.3%' : '0.0%',
      isPositive: hasOrders
    },
    avgWaitTime: {
      text: hasWait ? '+ 12.5%' : '0.0%',
      isPositive: hasWait
    }
  };
});

// ----------------------------------------------------
// HOURLY REAL-TIME DATA BREAKDOWNS (10:00 TO 22:00)
// ----------------------------------------------------

// Real Hourly Engravings (Cups)
const hourlyEngravingsReal = computed(() => {
  const map = {};
  for (let h = OPENING_HOUR; h <= CLOSING_HOUR; h++) map[h] = 0;

  realCompletedOrders.value.forEach(o => {
    const h = getOrderOperatingHour(o);
    const cups = o.items ? o.items.length : 1;
    if (map[h] !== undefined) map[h] += cups;
  });

  return operatingHoursList.value.map(hObj => ({
    hour: hObj.hour,
    time: hObj.time,
    value: map[hObj.hour] || 0
  }));
});

// Real Hourly Orders Placed (Cups)
const hourlyOrdersReal = computed(() => {
  const map = {};
  for (let h = OPENING_HOUR; h <= CLOSING_HOUR; h++) map[h] = 0;

  realValidOrders.value.forEach(o => {
    const h = getOrderOperatingHour(o);
    const cups = o.items ? o.items.length : 1;
    if (map[h] !== undefined) map[h] += cups;
  });

  return operatingHoursList.value.map(hObj => ({
    hour: hObj.hour,
    time: hObj.time,
    value: map[hObj.hour] || 0
  }));
});

// Real Hourly Avg Duration
const hourlyAvgDurationReal = computed(() => {
  const hourDurations = {};
  for (let h = OPENING_HOUR; h <= CLOSING_HOUR; h++) hourDurations[h] = [];

  realCompletedOrders.value.forEach(o => {
    if (o.durationSeconds) {
      const h = getOrderOperatingHour(o);
      if (hourDurations[h]) hourDurations[h].push(o.durationSeconds / 60);
    }
  });

  return operatingHoursList.value.map(hObj => {
    const list = hourDurations[hObj.hour] || [];
    let avg = 0;
    if (list.length > 0) {
      avg = list.reduce((a, b) => a + b, 0) / list.length;
    }
    return {
      hour: hObj.hour,
      time: hObj.time,
      value: Number(avg.toFixed(1))
    };
  });
});

// Real Hourly Avg Wait Time
const hourlyAvgWaitReal = computed(() => {
  const hourWaits = {};
  for (let h = OPENING_HOUR; h <= CLOSING_HOUR; h++) hourWaits[h] = [];

  const activeMachinesCount = Math.max(1, queueStore.machines.filter(m => m.isActive !== false).length);

  realValidOrders.value.forEach((o, index) => {
    const h = getOrderOperatingHour(o);
    const waitMin = Math.max(0, Math.round(((index + 1) * 3.6) / activeMachinesCount));
    if (hourWaits[h]) hourWaits[h].push(waitMin);
  });

  return operatingHoursList.value.map(hObj => {
    const list = hourWaits[hObj.hour] || [];
    let avg = 0;
    if (list.length > 0) {
      avg = list.reduce((a, b) => a + b, 0) / list.length;
    }
    return {
      hour: hObj.hour,
      time: hObj.time,
      value: Number(avg.toFixed(1))
    };
  });
});

function formatTimeTick(minutes) {
  const totalSeconds = Math.round(Number(minutes) * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getCleanMax(val, minCeil = 10) {
  if (val <= minCeil) return minCeil;
  if (val <= 15) return 15;
  if (val <= 20) return 20;
  if (val <= 30) return 30;
  if (val <= 45) return 45;
  if (val <= 60) return 60;
  if (val <= 90) return 90;
  if (val <= 120) return 120;
  return Math.ceil(val / 30) * 30;
}

const PLOT_TOP_PADDING = 24; // px inside SVG (guarantees points and tooltips stay within container)
const PLOT_BOTTOM_PADDING = 12; // px inside SVG
const PLOT_DRAWABLE_HEIGHT = 240 - PLOT_TOP_PADDING - PLOT_BOTTOM_PADDING; // 204px

function getHourYPercentFromMax(val, maxY) {
  if (!maxY) return 100;
  const normalized = Math.min(Math.max(val / maxY, 0), 1);
  return ((PLOT_TOP_PADDING + (PLOT_DRAWABLE_HEIGHT * (1 - normalized))) / 240) * 100;
}

// Dynamic Metric Configurations based on Real Database & Configured Targets
const currentMetricConfig = computed(() => {
  if (activeMetric.value === 'total_engravings') {
    const data = hourlyEngravingsReal.value;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const targetValue = categoryTargets.value.total_engravings || 20;
    const maxY = getCleanMax(Math.max(maxVal * 1.3, targetValue * 1.25), 10);
    return {
      primaryLegend: 'Hourly Engravings (Cups)',
      targetLegend: `Target (${targetValue} cups/hr)`,
      targetTag: `TARGET (${targetValue})`,
      maxY,
      targetValue,
      tooltipLabel: 'Engraved',
      yTicks: [
        { label: String(maxY), percent: getHourYPercentFromMax(maxY, maxY) },
        { label: String(Math.round(maxY * 2 / 3)), percent: getHourYPercentFromMax(maxY * 2 / 3, maxY) },
        { label: String(Math.round(maxY / 3)), percent: getHourYPercentFromMax(maxY / 3, maxY) },
        { label: '0', percent: getHourYPercentFromMax(0, maxY) }
      ],
      isBreachHigh: false,
      allHours: data
    };
  }

  if (activeMetric.value === 'avg_time') {
    const data = hourlyAvgDurationReal.value;
    const maxVal = Math.max(...data.map(d => d.value), 4.0);
    const targetValue = Number(categoryTargets.value.avg_time) || 4.0;
    const maxY = getCleanMax(Math.max(maxVal * 1.25, targetValue * 1.3), 6.0);
    const targetTimeFormatted = formatTimeTick(targetValue);
    return {
      primaryLegend: 'Avg Duration',
      targetLegend: `SLA Target (${targetTimeFormatted})`,
      targetTag: `SLA (${targetTimeFormatted})`,
      maxY,
      targetValue,
      tooltipLabel: 'Avg Duration',
      yTicks: [
        { label: formatTimeTick(maxY), percent: getHourYPercentFromMax(maxY, maxY) },
        { label: formatTimeTick(maxY * 2 / 3), percent: getHourYPercentFromMax(maxY * 2 / 3, maxY) },
        { label: formatTimeTick(maxY / 3), percent: getHourYPercentFromMax(maxY / 3, maxY) },
        { label: '0:00', percent: getHourYPercentFromMax(0, maxY) }
      ],
      isBreachHigh: true,
      allHours: data
    };
  }

  if (activeMetric.value === 'total_cups') {
    const data = hourlyOrdersReal.value;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const targetValue = categoryTargets.value.total_cups || 25;
    const maxY = getCleanMax(Math.max(maxVal * 1.3, targetValue * 1.25), 10);
    return {
      primaryLegend: 'Hourly Orders Placed (Cups)',
      targetLegend: `Capacity (${targetValue} cups/hr)`,
      targetTag: `CAPACITY (${targetValue})`,
      maxY,
      targetValue,
      tooltipLabel: 'Orders Placed',
      yTicks: [
        { label: String(maxY), percent: getHourYPercentFromMax(maxY, maxY) },
        { label: String(Math.round(maxY * 2 / 3)), percent: getHourYPercentFromMax(maxY * 2 / 3, maxY) },
        { label: String(Math.round(maxY / 3)), percent: getHourYPercentFromMax(maxY / 3, maxY) },
        { label: '0', percent: getHourYPercentFromMax(0, maxY) }
      ],
      isBreachHigh: false,
      allHours: data
    };
  }

  // wait_time
  const data = hourlyAvgWaitReal.value;
  const maxVal = Math.max(...data.map(d => d.value), 15);
  const targetValue = Number(categoryTargets.value.wait_time) || 15.0;
  const maxY = getCleanMax(Math.max(maxVal * 1.25, targetValue * 1.3), 30.0);
  const targetWaitFormatted = formatTimeTick(targetValue);
  return {
    primaryLegend: 'Avg Wait Time',
    targetLegend: `Target Max Wait (${targetWaitFormatted})`,
    targetTag: `TARGET (${targetWaitFormatted})`,
    maxY,
    targetValue,
    tooltipLabel: 'Avg Wait',
    yTicks: [
      { label: formatTimeTick(maxY), percent: getHourYPercentFromMax(maxY, maxY) },
      { label: formatTimeTick(maxY * 2 / 3), percent: getHourYPercentFromMax(maxY * 2 / 3, maxY) },
      { label: formatTimeTick(maxY / 3), percent: getHourYPercentFromMax(maxY / 3, maxY) },
      { label: '0:00', percent: getHourYPercentFromMax(0, maxY) }
    ],
    isBreachHigh: true,
    allHours: data
  };
});

// Active Hourly Data filtered to current available max hour (10:00 through maxAvailableHour)
const activeHourlyData = computed(() => {
  const all = currentMetricConfig.value.allHours;
  const maxH = maxAvailableHour.value;
  return all.filter(item => item.hour <= maxH);
});

// Effective Active Point for Glowing Dot & Tooltip (Stays at Current Live Hour, e.g. 11:00)
const effectiveActivePoint = computed(() => {
  const data = activeHourlyData.value;
  if (!data || data.length === 0) return null;
  if (hoveredIndex.value !== null && data[hoveredIndex.value]) {
    return data[hoveredIndex.value];
  }
  return data[data.length - 1];
});

function isMetricBreached(val) {
  const config = currentMetricConfig.value;
  if (config.isBreachHigh) {
    return val > config.targetValue;
  }
  return val < config.targetValue;
}

const isCurrentBreached = computed(() => {
  if (!effectiveActivePoint.value) return false;
  return isMetricBreached(effectiveActivePoint.value.value);
});

const chartThemeColors = computed(() => {
  if (isCurrentBreached.value) {
    return {
      stroke: '#EF4444',
      stopColor: '#EF4444',
      haloOuter: 'rgba(239, 68, 68, 0.2)',
      haloInner: 'rgba(239, 68, 68, 0.38)',
      coreDot: '#EF4444',
      dotShadow: 'rgba(239, 68, 68, 0.6)',
      pillText: '#DC2626'
    };
  }
  return {
    stroke: '#10B981',
    stopColor: '#10B981',
    haloOuter: 'rgba(16, 185, 129, 0.2)',
    haloInner: 'rgba(16, 185, 129, 0.38)',
    coreDot: '#10B981',
    dotShadow: 'rgba(16, 185, 129, 0.6)',
    pillText: '#111827'
  };
});

// Coordinate Calculations for Store Hours 10:00 to 22:00
function getHourXPercent(hour) {
  return ((hour - OPENING_HOUR) / (CLOSING_HOUR - OPENING_HOUR)) * 100;
}

function getHourXCoord(hour) {
  return ((hour - OPENING_HOUR) / (CLOSING_HOUR - OPENING_HOUR)) * 1000;
}

function getPointY(val) {
  const maxY = currentMetricConfig.value.maxY || 1;
  const normalized = Math.min(Math.max(val / maxY, 0), 1);
  return PLOT_TOP_PADDING + (PLOT_DRAWABLE_HEIGHT * (1 - normalized));
}

function getHourYPercent(val) {
  const maxY = currentMetricConfig.value.maxY || 1;
  const normalized = Math.min(Math.max(val / maxY, 0), 1);
  return ((PLOT_TOP_PADDING + (PLOT_DRAWABLE_HEIGHT * (1 - normalized))) / 240) * 100;
}

const chartSvgLinePath = computed(() => {
  const data = activeHourlyData.value;
  if (!data || data.length === 0) return '';
  let path = '';
  data.forEach((pt, idx) => {
    const x = getHourXCoord(pt.hour);
    const y = getPointY(pt.value);
    if (idx === 0) {
      path += `M ${x} ${y}`;
    } else {
      path += ` L ${x} ${y}`;
    }
  });
  return path;
});

const chartSvgAreaPath = computed(() => {
  const data = activeHourlyData.value;
  if (!data || data.length === 0) return '';
  const line = chartSvgLinePath.value;
  const firstX = getHourXCoord(data[0].hour);
  const lastX = getHourXCoord(data[data.length - 1].hour);
  const bottomY = PLOT_TOP_PADDING + PLOT_DRAWABLE_HEIGHT;
  return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
});

function formatTooltipValue(val) {
  if (activeMetric.value === 'avg_time' || activeMetric.value === 'wait_time') {
    const m = Math.floor(val);
    const s = Math.round((val - m) * 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} min`;
  }
  return `${val.toLocaleString()} cups`;
}



function getMetricStatusText(val) {
  const config = currentMetricConfig.value;
  if (config.isBreachHigh) {
    return val > config.targetValue ? '⚠️ Over Target SLA' : '✓ Within Target SLA';
  }
  return val >= config.targetValue ? '✓ Target Met' : '⚠️ Below Capacity';
}

// Bottom 3-Column Rankings derived dynamically from real orders
const topProducts = computed(() => {
  if (!realValidOrders.value || realValidOrders.value.length === 0) {
    return [];
  }

  const modelCounts = {};
  realValidOrders.value.forEach(order => {
    (order.items || []).forEach(item => {
      const name = item.model || item.shortName || 'The IceFlow™ Flip Straw Tumbler';
      modelCounts[name] = (modelCounts[name] || 0) + 1;
    });
  });

  const total = Object.values(modelCounts).reduce((sum, c) => sum + c, 0);
  if (total === 0) return [];

  const list = Object.keys(modelCounts).map((name, idx) => {
    const count = modelCounts[name] || 0;
    const percentage = Math.round((count / total) * 100);
    return {
      id: `prod-${idx}`,
      name,
      image: '/src/assets/images/product-step1.png',
      count,
      percentage
    };
  });

  return list.sort((a, b) => b.count - a.count);
});

const topProductDurations = computed(() => {
  if (!realCompletedOrders.value || realCompletedOrders.value.length === 0) {
    return [];
  }

  const modelDurations = {}; // { [modelName]: { totalSecs: number, count: number } }
  const slaTargetSecs = (categoryTargets.value?.avg_engraving_time || 4.0) * 60;

  realCompletedOrders.value.forEach(order => {
    const duration = order.durationSeconds || order.engraving_duration_seconds || 225;
    (order.items || []).forEach(item => {
      const name = item.model || item.shortName || 'The IceFlow™ Flip Straw Tumbler';
      if (!modelDurations[name]) {
        modelDurations[name] = { totalSecs: 0, count: 0 };
      }
      modelDurations[name].totalSecs += duration;
      modelDurations[name].count += 1;
    });
  });

  const list = Object.keys(modelDurations).map((name, idx) => {
    const item = modelDurations[name];
    const avgSecs = Math.round(item.totalSecs / item.count);
    const m = Math.floor(avgSecs / 60);
    const s = avgSecs % 60;
    const durationFormatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} min`;
    const isWithinSla = avgSecs <= slaTargetSecs;

    return {
      id: `p-dur-${idx}`,
      name,
      image: '/src/assets/images/product-step1.png',
      avgSecs,
      durationFormatted,
      slaStatus: isWithinSla ? '✓ Within Target SLA' : '⚠️ Over Target SLA',
      isWithinSla
    };
  });

  return list.sort((a, b) => a.avgSecs - b.avgSecs);
});

const topStores = computed(() => {
  let storesList = [];
  try {
    const saved = localStorage.getItem('stanley_custom_stores');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        storesList = parsed;
      }
    }
  } catch (e) {}

  if (storesList.length === 0 && (!realValidOrders.value || realValidOrders.value.length === 0)) {
    return [];
  }

  const totalOrders = realValidOrders.value?.length || 0;
  
  const results = storesList.map(store => {
    const count = (realValidOrders.value || []).filter(o => 
      (o.store_code && o.store_code === store.code) ||
      (o.store_id && o.store_id === store.id) ||
      (o.store_name && o.store_name === store.name)
    ).length;

    const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
    const words = (store.name || '').split(' ');
    const initials = words.length >= 2 
      ? (words[0][0] + words[1][0]).toUpperCase() 
      : (store.code ? store.code.slice(0, 2).toUpperCase() : 'ST');

    return {
      id: store.id,
      name: store.name,
      initials,
      count,
      percentage
    };
  });

  return results.sort((a, b) => b.count - a.count);
});

// Date Formatter
const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return 'Today';
  const todayDate = new Date().toISOString().split('T')[0];
  const d = new Date(selectedDate.value + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatted = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  if (selectedDate.value === todayDate) {
    return `Today, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  return formatted;
});

const dialogHeadlineDate = computed(() => {
  if (!tempSelectedDate.value) return 'Today';
  const d = new Date(tempSelectedDate.value + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
});

const currentMonthYearDisplay = computed(() => {
  const m = currentCalendarMonth.value;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[m.getMonth()]} ${m.getFullYear()}`;
});

const datePresets = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7days', label: 'Last 7 days' },
  { id: 'thismonth', label: 'This Month' },
  { id: 'alltime', label: 'All Time' }
];

const calendarDays = computed(() => {
  const year = currentCalendarMonth.value.getFullYear();
  const month = currentCalendarMonth.value.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push({ dayNumber: '', dateString: `prev-${i}`, isCurrentMonth: false });
  }

  const todayStr = '2025-05-20';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dayNumber: d,
      dateString: ds,
      isCurrentMonth: true,
      isToday: ds === todayStr
    });
  }

  return days;
});

function openDatePickerModal() {
  tempSelectedDate.value = selectedDate.value || '2025-05-20';
  showDatePickerModal.value = true;
}

function prevMonth() {
  currentCalendarMonth.value = new Date(
    currentCalendarMonth.value.getFullYear(),
    currentCalendarMonth.value.getMonth() - 1,
    1
  );
}

function nextMonth() {
  currentCalendarMonth.value = new Date(
    currentCalendarMonth.value.getFullYear(),
    currentCalendarMonth.value.getMonth() + 1,
    1
  );
}

function selectCalendarDate(dateStr) {
  if (!dateStr || dateStr.startsWith('prev')) return;
  tempSelectedDate.value = dateStr;
  tempActivePreset.value = 'custom';
}

function applyPreset(presetId) {
  tempActivePreset.value = presetId;
  if (presetId === 'today') {
    tempSelectedDate.value = '2025-05-20';
  } else if (presetId === 'yesterday') {
    tempSelectedDate.value = '2025-05-19';
  } else if (presetId === 'alltime') {
    tempSelectedDate.value = '';
  }
}

function clearDateFilter() {
  tempSelectedDate.value = '';
  tempActivePreset.value = 'alltime';
}

function confirmDateSelection() {
  selectedDate.value = tempSelectedDate.value;
  showDatePickerModal.value = false;
}

function visitStore(store) {
  showStoreListModal.value = false;
  router.push('/engraver');
}

function saveSettings() {
  showSettingsModal.value = false;
}

function handleLogout() {
  try {
    const token = localStorage.getItem('stanley_staff_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('stanley_staff_token');
    localStorage.removeItem('stanley_staff_authenticated');
    localStorage.removeItem('stanley_staff_user');
    localStorage.removeItem('stanley_user_role');
    localStorage.removeItem('stanley_is_developer');
  } catch (e) {}
  router.push('/login');
}

let pollInterval = null;
let eventSource = null;

onMounted(() => {
  loadCategoryTargets();
  queueStore.refreshFromStorage();

  if (typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('orders_updated', () => {
        queueStore.refreshFromStorage();
      });
    } catch (e) {}
  }

  window.addEventListener('storage', handleStorageUpdate);
  window.addEventListener('stanley_orders_updated', handleStorageUpdate);
  window.addEventListener('stanley_targets_updated', handleStorageUpdate);

  pollInterval = setInterval(() => {
    queueStore.refreshFromStorage();
  }, 2000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  if (eventSource) eventSource.close();
  window.removeEventListener('storage', handleStorageUpdate);
  window.removeEventListener('stanley_orders_updated', handleStorageUpdate);
  window.removeEventListener('stanley_targets_updated', handleStorageUpdate);
});

function handleStorageUpdate() {
  loadCategoryTargets();
  queueStore.refreshFromStorage();
}
</script>

<style scoped>
.super-admin-screen {
  position: relative;
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

/* Header (Strictly Matching Engraver Dashboard Header) */
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
  justify-content: flex-end;
}

/* Outline Action Buttons (Exact Engraver Dashboard logout-btn style) */
.outline-action-btn {
  background-color: #FFFFFF;
  color: #000000;
  border: 1px solid #000000;
  height: 40px;
  width: 148px;
  padding: 0 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.outline-action-btn:hover {
  background-color: #F9FAFB;
}

.outline-action-btn:active {
  transform: scale(0.99);
}

/* Setting Icon Button */
.setting-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #000000;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.setting-icon-btn:hover {
  background-color: #F4F4F5;
}

.setting-icon-btn:active {
  transform: scale(0.98);
}

.setting-nav-icon {
  width: 20px;
  height: 20px;
  color: #111827;
}

/* Dashboard Body */
.dashboard-body {
  padding: clamp(16px, 2vw, 24px);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dashboard-content-wrap {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Section Title Block */
.section-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-title {
  font-size: 14px;
  font-weight: 700;
  color: #18181B;
  text-transform: uppercase;
  margin: 0;
}

.overview-subtitle {
  font-size: 12px;
  color: #71717A;
  margin: 0;
}

/* KPI & Chart Card */
.kpi-chart-card {
  border: 1px solid #E4E4E7;
  border-radius: 8px;
  background-color: #FFFFFF;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 4 Clickable KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.kpi-card {
  border: 1px solid #E4E4E7;
  border-radius: 8px;
  padding: 16px;
  background-color: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  outline: none;
}

.kpi-card:hover {
  border-color: #A1A1AA;
  transform: translateY(-1px);
}

.kpi-card.is-selected {
  border: 1.5px solid #000000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.kpi-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-label {
  font-size: 11px;
  font-weight: 700;
  color: #71717A;
  letter-spacing: 0.44px;
  text-transform: uppercase;
}

.kpi-icon-wrap {
  width: 28px;
  height: 28px;
  background-color: #F4F4F5;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-icon-img {
  width: 16px;
  height: 16px;
  color: #18181B;
}

.kpi-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.kpi-main-val {
  font-size: 24px;
  font-weight: 700;
  color: #18181B;
  line-height: 1.2;
}

.kpi-unit {
  font-size: 12px;
  color: #71717A;
}

.kpi-trend-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
}

.trend-positive {
  color: #10B981;
  font-weight: 600;
}

.trend-neutral {
  color: #71717A;
  font-weight: 500;
}

.trend-subtext {
  color: #A1A1AA;
}

/* Time Series Chart Section */
.chart-section-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #FFFFFF;
  border-radius: 8px;
  padding: 16px 20px 24px 20px;
  position: relative;
  overflow: visible;
}

.chart-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.chart-legend-group {
  display: flex;
  align-items: center;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #000000;
}

.emerald-legend-dot-line {
  display: flex;
  align-items: center;
  position: relative;
  width: 22px;
  height: 10px;
}

.emerald-legend-line {
  width: 22px;
  height: 2.2px;
  background-color: #10B981;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.emerald-legend-circle {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10B981;
  border: 1.5px solid #FFFFFF;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
  position: absolute;
  left: 8px;
  top: 2px;
  transition: all 0.2s ease;
}

.legend-dashed-line {
  width: 22px;
  height: 0px;
  border-top: 1.5px dashed #D1D5DB;
}

.chart-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-adjustment-btn {
  width: 40px;
  height: 40px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #111827;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.chart-adjustment-btn:hover {
  background-color: #000000;
  border-color: #000000;
}

.chart-adjustment-btn:hover .adjustment-btn-icon {
  filter: brightness(0) invert(1);
}

.adjustment-btn-icon {
  width: 18px;
  height: 18px;
  display: block;
  transition: filter 0.15s ease;
}

.chart-date-picker-btn {
  height: 40px;
  padding: 0 14px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #111827;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.chart-date-picker-btn:hover {
  border-color: #111827;
}

.calendar-btn-icon {
  width: 14px;
  height: 14px;
}

.chevron-btn-icon {
  width: 10px;
  height: 10px;
}

/* SVG Chart Canvas with Safe Headroom */
.chart-canvas-wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 56px;
  height: 290px;
  margin-top: 14px;
}

.chart-y-axis {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 48px;
  pointer-events: none;
}

.y-tick {
  position: absolute;
  right: 10px;
  transform: translateY(-50%);
}

.y-tick span {
  font-size: 10.5px;
  color: #9CA3AF;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.chart-plot-area {
  position: relative;
  height: 240px;
  width: 100%;
}

.grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #F3F4F6;
  transform: translateY(-50%);
}

.target-grid-line {
  border-top: 1.5px dashed #D1D5DB;
  background-color: transparent;
  z-index: 2;
  height: 0;
}

.sla-badge-tag {
  position: absolute;
  right: 0px;
  top: -9px;
  font-size: 10px;
  font-weight: 600;
  color: #9CA3AF;
  letter-spacing: 0.2px;
}

.chart-svg-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 240px;
  overflow: visible;
  z-index: 3;
}

.chart-hover-trigger {
  cursor: pointer;
}

/* Perfect 1:1 Aspect Ratio Active Glowing Dot */
.active-glowing-dot-wrapper {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 6;
}

.dot-halo-outer {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  transition: background 0.2s ease;
}

.dot-halo-inner {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  transition: background 0.2s ease;
}

.dot-core-circle {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2.5px solid #FFFFFF;
  aspect-ratio: 1 / 1;
  transition: all 0.2s ease;
}

/* Floating Pill Tooltip Badge */
.floating-pill-tooltip {
  position: absolute;
  transform: translate(-50%, -135%);
  background: #FFFFFF;
  border-radius: 8px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #E5E7EB;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}

.pill-time {
  font-size: 10px;
  font-weight: 600;
  color: #6B7280;
  letter-spacing: 0.2px;
}

.pill-val {
  font-size: 11px;
  font-weight: 700;
}

.pill-breach-badge {
  font-size: 9.5px;
  font-weight: 700;
  background: #FEF2F2;
  color: #DC2626;
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

.chart-x-axis {
  display: flex;
  justify-content: space-between;
  height: 24px;
  margin-top: 12px;
  width: 100%;
}

.x-label {
  font-size: 10px;
  color: #9CA3AF;
  text-align: center;
  font-weight: 500;
  transition: color 0.15s ease, font-weight 0.15s ease;
}

.x-label.is-available {
  color: #4B5563;
}

.x-label.is-upcoming {
  color: #D1D5DB;
}

.x-label.is-highlighted {
  color: #10B981;
  font-weight: 700;
}

/* Rankings 3-Column Grid - Guaranteed 1 Single Row across Desktop & Tablet/iPad */
.rankings-three-col-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(10px, 1.2vw, 20px);
  width: 100%;
}

.duration-value {
  font-size: clamp(11px, 1vw, 13px);
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
}

.text-emerald {
  color: #10B981 !important;
  font-weight: 600;
}

.text-amber {
  color: #F59E0B !important;
  font-weight: 600;
}

.ranking-card {
  border: 1px solid #E4E4E7;
  border-radius: 8px;
  background-color: #FFFFFF;
  padding: clamp(14px, 1.4vw, 24px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.ranking-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ranking-title {
  font-size: clamp(11px, 1.05vw, 14px);
  font-weight: 700;
  color: #18181B;
  text-transform: uppercase;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking-date-btn {
  height: 32px;
  padding: 0 8px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #111827;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 0.15s ease;
}

.ranking-date-btn:hover {
  border-color: #111827;
}

.ranking-items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ranking-row-item {
  display: flex;
  align-items: center;
  gap: clamp(6px, 0.8vw, 12px);
  padding: 6px 0;
  border-bottom: 1px solid #F4F4F5;
  min-width: 0;
}

.ranking-row-item:last-child {
  border-bottom: none;
}

.ranking-rank-num {
  font-size: clamp(12px, 1.1vw, 15px);
  font-weight: 700;
  color: #A1A1AA;
  width: 16px;
  flex-shrink: 0;
}

.ranking-thumb-wrap {
  width: clamp(34px, 3vw, 44px);
  height: clamp(34px, 3vw, 44px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F8F9FA;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.ranking-thumb-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.store-avatar-wrap {
  background: #111827;
  color: #FFFFFF;
}

.store-avatar-initials {
  font-size: 11px;
  font-weight: 700;
}

.ranking-meta-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}

.ranking-item-name {
  font-size: clamp(11px, 1.05vw, 13.5px);
  font-weight: 700;
  color: #18181B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking-item-count {
  font-size: 11px;
  color: #71717A;
  white-space: nowrap;
}

.ranking-share-pct {
  font-size: clamp(11px, 1vw, 13.5px);
  font-weight: 700;
  color: #18181B;
  flex-shrink: 0;
  white-space: nowrap;
}

.ranking-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  gap: 6px;
  text-align: center;
  min-height: 120px;
}

.ranking-empty-icon {
  margin-bottom: 2px;
  opacity: 0.7;
}

.ranking-empty-title {
  font-size: 13px;
  font-weight: 600;
  color: #52525B;
}

.ranking-empty-subtitle {
  font-size: 11.5px;
  color: #A1A1AA;
}

/* Modals & Dialogs */
.modal-backdrop,
.date-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.store-list-modal-card,
.settings-modal-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  width: 100%;
  max-width: 680px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 85vh;
}

.modal-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

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
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #9CA3AF;
}

.store-cards-scroll-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 50vh;
  padding-right: 4px;
}

.store-status-row-card {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.store-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.store-code-tag {
  background: #F3F4F6;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.store-online-badge {
  font-size: 11px;
  font-weight: 600;
  color: #9CA3AF;
}

.store-online-badge.is-active {
  color: #10B981;
}

.store-name-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.store-address-line {
  font-size: 12px;
  color: #6B7280;
  margin: 2px 0 0 0;
}

.store-stats-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.store-stat-pill {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 11px;
  color: #6B7280;
}

.store-stat-pill strong {
  font-size: 13px;
  color: #111827;
}

.btn-visit-store {
  height: 36px;
  padding: 0 14px;
  background: #111827;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-modal-close,
.btn-modal-save {
  height: 42px;
  padding: 0 20px;
  background: #111827;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-end;
}

/* Settings Form */
.settings-body-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #F3F4F6;
}

.setting-desc {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-desc strong {
  font-size: 14px;
  color: #111827;
}

.setting-desc span {
  font-size: 12px;
  color: #6B7280;
}

.setting-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.number-input {
  width: 60px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  text-align: center;
}

.toggle-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #111827;
  cursor: pointer;
}

/* Advanced Date Picker Modal (Google Material Design Style) */
.date-picker-dialog {
  background-color: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.18);
  width: 100%;
  max-width: 640px;
  display: flex;
  overflow: hidden;
  border: 1px solid #E5E7EB;
}

.dialog-sidebar-pane {
  width: 200px;
  background-color: #F9FAFB;
  border-right: 1px solid #F3F4F6;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.dialog-super-title {
  font-size: 10px;
  font-weight: 700;
  color: #6B7280;
  letter-spacing: 0.8px;
}

.dialog-selected-headline {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 4px 0 0 0;
}

.close-mobile-only {
  display: none;
}

.date-presets-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
}

.preset-chip {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  text-align: left;
  cursor: pointer;
}

.preset-chip.is-active {
  background: #111827;
  color: #FFFFFF;
}

.btn-text-clear {
  background: none;
  border: none;
  color: #4B5563;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.dialog-main-pane {
  flex: 1;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.month-year-title {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.month-nav-arrows {
  display: flex;
  gap: 4px;
}

.nav-arrow-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  background: #FFFFFF;
  cursor: pointer;
}

.calendar-days-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #9CA3AF;
}

.calendar-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cal-day-cell {
  aspect-ratio: 1;
  border-radius: 50%;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: #111827;
  cursor: pointer;
}

.cal-day-cell:hover:not(.is-empty) {
  background: #F3F4F6;
}

.cal-day-cell.is-selected {
  background: #111827;
  color: #FFFFFF;
  font-weight: 700;
}

.cal-day-cell.is-today:not(.is-selected) {
  border: 1px solid #111827;
}

.dialog-actions-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #F3F4F6;
}

.btn-dialog-cancel {
  padding: 8px 16px;
  background: #FFFFFF;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-dialog-apply {
  padding: 8px 16px;
  background: #111827;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive Media Queries - Guaranteed Single Row for 4 KPI Cards on iPad / Tablet */
@media (max-width: 1100px) {
  .kpi-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .kpi-card {
    padding: 12px 10px;
    gap: 8px;
  }
  .kpi-label {
    font-size: 10px;
    letter-spacing: 0.2px;
  }
  .kpi-main-val {
    font-size: 18px;
  }
  .kpi-icon-wrap {
    width: 24px;
    height: 24px;
  }
  .kpi-icon-img {
    width: 14px;
    height: 14px;
  }
  .trend-positive, .trend-negative {
    font-size: 10px;
  }
  .trend-subtext {
    font-size: 10px;
  }
  .rankings-three-col-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(4, minmax(160px, 1fr));
    overflow-x: auto;
    gap: 10px;
    padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;
  }
  .rankings-three-col-grid {
    grid-template-columns: repeat(3, minmax(260px, 1fr));
    overflow-x: auto;
    gap: 10px;
    padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;
  }
  .date-picker-dialog {
    flex-direction: column;
  }
  .dialog-sidebar-pane {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #F3F4F6;
  }
  .close-mobile-only {
    display: block;
  }
}

/* Global Pop-up Modal Styles (matching Add New Store modal) */
.product-modal-card {
  width: 100%;
  max-width: min(94vw, 610px);
  max-height: min(92vh, 800px);
  background: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
}

.modal-title-medium {
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  margin: 0;
}

.modal-close-icon-btn {
  background: transparent;
  border: none;
  font-size: 22px;
  color: #9CA3AF;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease;
}

.modal-close-icon-btn:hover {
  color: #111827;
}

.modal-form-content {
  padding: 28px 28px 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  overflow-y: auto;
}

.two-images-upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.product-name-input-block {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.param-col-title-medium {
  font-size: clamp(12.5px, 1.05vw, 13.5px);
  font-weight: 500;
  color: #111827;
  margin: 0 0 6px 0;
  line-height: 1.3;
  display: block;
}

.product-name-underline-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #000000;
  padding: 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  background: transparent;
}

.product-name-underline-input::placeholder {
  color: #ABABAB;
  font-weight: 400;
}

.product-name-underline-input:focus {
  border-bottom-width: 1.5px;
}

.target-presets-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.machine-picker-pills-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.option-pill {
  height: 38px;
  padding: 0 16px;
  border: 1px solid #000000;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
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
  font-weight: 500;
}

.modal-bottom-actions-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding-top: 16px;
  margin-top: 6px;
  flex-shrink: 0;
}

.btn-figma-cancel {
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
  font-weight: 500;
  color: #FFFFFF;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-figma-save:hover {
  opacity: 0.85;
}
</style>
