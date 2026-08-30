 </div>
 </div>

 <div id="mesoCalSection" style="display:none;margin-bottom:12px">
 <div id="mesoCalContent"></div>
 <button class="btn-primary" id="advanceWeekBtn" style="background:rgba(33,150,243,.06);border:1px solid rgba(33,150,243,.12);color:#2196F3;font-size:.6rem;padding:6px 0;display:none" data-i18n="complete_week">Complete Week &amp; Advance</button>
 </div>

 <div id="perDetail" class="per-detail" style="display:none"></div>

 <div class="btn-group">
 <button class="btn-primary" id="changeSplitBtn" style="background:transparent;border:1.5px solid rgba(250,250,248,.08);color:rgba(250,250,248,.35);font-size:.65rem;padding:8px 0;flex:.5" data-i18n="change_split">Change Split</button>
 <button class="btn-primary" id="savePdfBtn" style="background:rgba(244,201,59,.06);border:1px solid rgba(244,201,59,.15);color:#F4C93B;font-size:.65rem;padding:8px 0;flex:.5" data-i18n="save_pdf">Save PDF</button>
 <button class="btn-primary" id="exportIcsBtn" style="background:rgba(33,150,243,.06);border:1px solid rgba(33,150,243,.12);color:#2196F3;font-size:.65rem;padding:8px 0;flex:.5" data-i18n="export_cal">Export Calendar</button>
 <button class="btn-primary" id="goToHistBtn" style="font-size:.65rem;padding:8px 0;flex:.5" data-i18n="history">History &amp; Stats</button>
 </div>
 <div class="btn-group" style="margin-top:6px">
 <button class="btn-secondary" id="exportBtn" style="background:rgba(76,175,80,.06);border:1px solid rgba(76,175,80,.12);color:#4CAF50;font-size:.55rem" data-i18n="export">⬇ Export</button>
 <button class="btn-secondary" id="importBtn" style="background:rgba(33,150,243,.06);border:1px solid rgba(33,150,243,.12);color:#2196F3;font-size:.55rem" data-i18n="import">⬆ Import</button>
 <button class="btn-secondary" id="resetBtn" style="background:rgba(244,67,54,.06);border:1px solid rgba(244,67,54,.12);color:#f44336;font-size:.55rem" data-i18n="reset">Reset All</button>
 </div>
 <input type="file" id="importFile" accept=".json" style="display:none">
 </div>
 </div>

 <!-- Screen 5: History & Stats -->
 <div class="step-content" id="step5">
 <div class="card">
 <div class="section-header"><span data-i18n="coach_note">Coach's Note</span></div>
 <div id="coachNote" style="font-size:.6rem;line-height:1.6;padding:4px 0"></div>
 </div>
 <div class="card">
 <div class="section-header"><span data-i18n="track_progress">Volume Dashboard</span> <span class="section-sub" id="histWeekLabel"></span></div>
 <p style="font-size:.55rem;color:rgba(250,250,248,.18);margin-bottom:6px;line-height:1.2">Logged sets this week (yellow bar) vs MEV–MAV–MRV (green to red).</p>
