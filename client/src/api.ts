export const getAuthStatus = async () => {
  const res = await fetch('http://localhost:3001/auth/status', {
    credentials: 'include',
  });
  return res.json();
};

export const getImages = async () => {
  const res = await fetch('http://localhost:3001/images', {
    credentials: 'include',
  });
  return res.json();
};

export const uploadImage = async (file: File) => {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch('http://localhost:3001/upload', {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Upload failed');

  return res.json();
};


export async function deleteImage(url: string): Promise<void> {
  const response = await fetch('http://localhost:3001/delete-image', {
    method: 'POST', // or DELETE if your backend supports
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete image');
  }
}