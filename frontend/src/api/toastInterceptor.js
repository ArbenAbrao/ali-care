import { api, messageFromError } from './client';
import { toast } from '../components/Toast';

const successMap = [
  [/\/auth\/admin\/login$/, 'Signed in', 'Welcome back to ALI-CARE.'],
  [/\/auth\/superadmin\/request-otp$/, 'Code sent', 'Check your email for the verification code.'],
  [/\/auth\/superadmin\/verify-otp$/, 'Signed in', 'Welcome back to ALI-CARE.'],
  [/\/auth\/logout$/, 'Signed out', 'See you soon.'],
  [/\/employee\/lookup$/, 'Employee verified', 'You can now submit your concern.'],
  [/\/employee\/submit$/, 'Complaint submitted', 'Thank you for speaking up.'],
  [/\/employee\/import$/, 'Import complete', 'Your file was processed.'],
  [/\/employee\/qr$/, 'QR code generated', 'Print it and place it at the location.'],
  [/\/employee$/, 'Employee added', 'The record was saved.'],
  [/\/employee\/\d+$/, 'Employee updated', 'Your changes were saved.'],
  [/\/admin\/accounts$/, 'Account created', 'The new account is ready to use.'],
  [/\/admin\/accounts\/\d+$/, 'Account updated', 'Your changes were saved.'],
];

api.interceptors.response.use(
  (res) => {
    const method = (res.config.method || 'get').toLowerCase();
    if (method !== 'get') {
      const hit = successMap.find(([re]) => re.test((res.config.url || '').split('?')[0]));
      if (hit) toast.success(hit[1], hit[2]);
    }
    return res;
  },
  (err) => {
    const method = (err.config?.method || 'get').toLowerCase();
    if (method !== 'get') toast.error('Something went wrong', messageFromError(err));
    return Promise.reject(err);
  }
);