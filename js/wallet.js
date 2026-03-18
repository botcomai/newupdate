// ==========================================
// MANUAL FUNDING SETTINGS (loaded from DB)
// ==========================================
let manualEnabled = false;
let manualMomoNumber = '';
let manualMomoName = '';

async function loadPaymentSettings() {
  try {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['manual_transfer_enabled', 'manual_momo_number', 'manual_momo_name']);

    if (settings) {
      settings.forEach((s) => {
        if (s.key === 'manual_transfer_enabled') manualEnabled = s.value === 'true';
        if (s.key === 'manual_momo_number') manualMomoNumber = s.value;
        if (s.key === 'manual_momo_name') manualMomoName = s.value;
      });
    }

    const momoNumInline = document.getElementById('momoNumberInline');
    const momoNameInline = document.getElementById('momoNameInline');
    if (momoNumInline) momoNumInline.innerText = manualMomoNumber || '---';
    if (momoNameInline) momoNameInline.innerText = manualMomoName || '---';

    const manualOpt = document.getElementById('optManual');
    const fundBtn = document.getElementById('fundBtn');

    if (!manualEnabled && manualOpt) {
      manualOpt.style.opacity = '0.4';
      manualOpt.style.pointerEvents = 'none';
      manualOpt.innerHTML = '<h4>Manual Transfer (Agent)</h4><p style="color:#ef4444; font-weight:600;">Currently unavailable</p>';
    }

    if (!manualEnabled && fundBtn) {
      fundBtn.disabled = true;
      fundBtn.innerText = 'Manual funding is currently disabled';
      fundBtn.style.background = '#94a3b8';
    }
  } catch (e) {
    console.error('Failed to load payment settings:', e);
  }
}

document.addEventListener('DOMContentLoaded', loadPaymentSettings);

function processFunding() {
  submitManualRequest();
}

function selectPaymentMethod() {
  // Kept for compatibility with existing inline handlers.
}

function calculateFundingFee() {
  // No gateway fee is calculated for manual transfer flow.
}

function prepareManualTransfer() {
  const amountInput = parseFloat(document.getElementById("amount").value);
  if(isNaN(amountInput) || amountInput <= 0) {
    alert("Please enter a valid amount first.");
    return;
  }

  // Generate Reference ID if not already set
  let refEl = document.getElementById("refId");
  if (refEl && !refEl.innerText) {
    let randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    refEl.innerText = "D4G-" + randomChars;
  }
  
  // Inject latest details from settings
  const momoNum = document.getElementById("momoNumberInline");
  const momoName = document.getElementById("momoNameInline");
  if (momoNum) momoNum.innerText = manualMomoNumber || '---';
  if (momoName) momoName.innerText = manualMomoName || '---';

  // Manual requests are finalized by the user clicking 'Submit Manual Request'
}

function closeManualModal() {
  // Keeping for compatibility with possible state resets
}

async function submitManualRequest() {
  let amount = parseFloat(document.getElementById("amount").value);
  let refId = document.getElementById("refId").innerText;

  if(isNaN(amount) || amount <= 0) {
    alert("Invalid amount.");
    return;
  }

  const submitBtn = document.getElementById("fundBtn") || document.getElementById("submitManualBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting Request...";
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) {
      window.location.href = "login.html";
      return;
    }

    // Fetch user phone natively
    let { data: currUser } = await supabase
      .from("users")
      .select("phone")
      .eq("id", user.id)
      .single();

    // Insert pending transaction (balance remains untouched)
    const { error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "Deposit (Manual)",
        amount: amount,
        status: "pending",
        reference: refId
      });

    if (insertError) throw insertError;

    // Dispatch SMS Notification
    if(window.sendSmsNotification && currUser?.phone) {
      window.sendSmsNotification(currUser.phone, `Your manual funding request of ₵${amount} with Ref: ${refId} is pending review by our agents.`);
    }

    closeManualModal();
    
    if(window.showSuccessPopup) {
      window.showSuccessPopup("Request Submitted!", "Your manual funding request has been submitted. We will process it shortly.", () => {
        window.location.reload();
      });
    } else {
      alert("Manual funding request submitted successfully! We will process it shortly.");
      window.location.reload();
    }
    
  } catch (err) {
    alert("Failed to submit request.");
    console.error(err);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit Manual Request";
    }
  }
}

// Globalize all necessary functions
window.submitManualRequest = submitManualRequest;
window.processFunding = processFunding;
window.selectPaymentMethod = selectPaymentMethod;
window.calculateFundingFee = calculateFundingFee;
