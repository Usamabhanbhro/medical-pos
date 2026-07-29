import React, { useState } from 'react';
import { getStoreDetails, saveStoreDetails } from '../../routes/api';

function IconEdit(props: { className?: string }) {
  // simple pencil icon (Heroicons-style)
  return (
    <svg className={props.className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 21v-3.75L15.81 4.44a1.5 1.5 0 012.12 0l1.63 1.63a1.5 1.5 0 010 2.12L6.75 20.25H3z" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M18.37 6.63l-1.63-1.63" />
    </svg>
  );
}

const Settings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');

  // Fetch store details from backend on mount
  React.useEffect(() => {
    let ignore = false;
    const loadStoreDetails = async () => {
      try {
        const details = await getStoreDetails();
        if (ignore) return;
        setStoreName(details.name);
        setStoreAddress(details.address);
        setStorePhone(details.phone);
        try {
          localStorage.setItem('storeName', details.name);
          localStorage.setItem('storeAddress', details.address);
          localStorage.setItem('storePhone', details.phone);
        } catch (err) {
          console.warn('Unable to cache store info locally', err);
        }
      } catch (err) {
        console.error('Failed to load store details', err);
      }
    };
    loadStoreDetails();
    return () => {
      ignore = true;
    };
  }, []);

  const openEdit = () => setOpen(true);
  const close = () => setOpen(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Save store details to backend
    saveStoreDetails({ name: storeName, address: storeAddress, phone: storePhone })
      .then(details => {
        setStoreName(details.name);
        setStoreAddress(details.address);
        setStorePhone(details.phone);
        try {
          localStorage.setItem('storeName', details.name);
          localStorage.setItem('storeAddress', details.address);
          localStorage.setItem('storePhone', details.phone);
        } catch (err) {
          console.warn('Unable to cache store info locally', err);
        }
        close();
      })
      .catch(err => {
        console.error('Failed to save store details', err);
        window.alert('Failed to save store details. Please try again.');
      });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Settings</h2>
          <p className="text-gray-600">Update account and application preferences.</p>
        </div>
        <div>
          <button
            onClick={openEdit}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="Edit settings"
          >
            <IconEdit className="w-4 h-4 text-white" />
            <span className="font-medium">Edit</span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 max-w-2xl sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Store name</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{storeName || 'Not set'}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Store address</div>
          <div className="mt-1 text-sm text-gray-700 whitespace-pre-line break-words">
            {storeAddress ? storeAddress : 'Add your address so it prints on receipts.'}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Store phone</div>
          <div className="mt-1 text-sm text-gray-700">
            {storePhone ? storePhone : 'Add a phone number so customers can contact you easily.'}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-30" onClick={close} />
          <div className="bg-white rounded shadow-lg p-6 z-50 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Settings</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Store Name</label>
                <input value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g. Medical POS" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Store Address</label>
                <input value={storeAddress} onChange={e => setStoreAddress(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g. 123 Main St, City" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Store Phone</label>
                <input value={storePhone} onChange={e => setStorePhone(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g. 0300-1234567" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full px-3 py-2 border rounded" placeholder="••••••••" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={close} className="px-3 py-2 rounded border">Cancel</button>
                <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
