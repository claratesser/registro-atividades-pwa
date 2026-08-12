import apiClient from './config.js';

const tasksApi = {
  getAll() {
    return apiClient.get('/tasks');
  },

  create({ title, imgAttachmentKey }) {
  const payload = { title };

  if (imgAttachmentKey != null) {
    payload.img_attachment_key = imgAttachmentKey;
  }

  return apiClient.post('/tasks', payload);
},

  update(id, data) {
    return apiClient.patch(`/tasks/${id}`, data);
  },

  remove(id) {
    return apiClient.delete(`/tasks/${id}`);
  },

  uploadImage(file, description = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    return apiClient.post('/uploads/images/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default tasksApi;
