<template>
  <form class="task-form" @submit.prevent="handleSubmit">
    <div class="task-row">
      <input
        v-model="newTask"
        type="text"
        placeholder="Nova tarefa..."
        class="task-input"
      />

      <button
        type="submit"
        class="task-button"
        :disabled="uploading"
      >
        {{ editingTask ? "Alterar" : "Adicionar" }}
      </button>

      <button
        v-if="editingTask"
        type="button"
        class="task-button-cancel"
        @click="handleCancel"
      >
        Cancelar
      </button>
    </div>

    <div class="image-section">
      <img
        v-if="previewUrl || editingTask?.img_url"
        :src="previewUrl || editingTask?.img_url"
        class="image-preview"
        alt="Imagem da tarefa"
      />

      <label
        class="image-label"
        :class="{ disabled: uploading }"
      >
        <span
          v-if="uploading"
          class="upload-status"
        >
          Enviando...
        </span>

        <span v-else>
          {{
            previewUrl || editingTask?.img_url
              ? "Trocar imagem"
              : "Adicionar imagem"
          }}
        </span>

        <input
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          class="image-input"
          :disabled="uploading"
          @change="handleImageChange"
        />
      </label>

      <p class="image-help">
        Em celular, o botão pode abrir a câmera.
        Em notebook, abre o seletor de arquivos.
      </p>
    </div>

    <div class="location-section">
      <p class="location-help">
        A localização será associada à tarefa e armazenada no backend.
      </p>

      <button
        type="button"
        class="location-button"
        :disabled="loadingLocation || !isSupported"
        @click="handleGetLocation"
      >
        {{
          loadingLocation
            ? "Obtendo localização..."
            : "Usar localização atual"
        }}
      </button>

      <p
        v-if="!isSupported"
        class="location-error"
      >
        Geolocalização não suportada neste dispositivo.
      </p>

      <p
        v-if="locationError"
        class="location-error"
      >
        {{ locationError }}
      </p>

      <div
        v-if="location"
        class="location-details"
      >
        <p>
          <strong>Latitude:</strong>
          {{ location.latitude }}
        </p>

        <p>
          <strong>Longitude:</strong>
          {{ location.longitude }}
        </p>

        <p v-if="location.accuracy != null">
          <strong>Precisão:</strong>
          {{ location.accuracy }} m
        </p>

        <p v-if="location.label">
          <strong>Endereço aproximado:</strong>
          {{ location.label }}
        </p>

        <TaskLocationMap :location="location" />

        <button
          type="button"
          class="location-remove"
          @click="clearLocation"
        >
          Remover localização
        </button>
      </div>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from "vue";

import tasksApi from "../api/tasksApi.js";
import geocodingApi from "../api/geocodingApi.js";

import TaskLocationMap from "./TaskLocationMap.vue";

import { useGeolocation } from "../composables/useGeolocation.js";

const props = defineProps({
  editingTask: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  "add",
  "update",
  "cancel",
]);

const newTask = ref("");
const previewUrl = ref(null);
const imgAttachmentKey = ref(null);
const uploading = ref(false);

const {
  isSupported,
  loadingLocation,
  locationError,
  location,
  setLocationFromTask,
  clearLocation,
  setLocationLabel,
  requestCurrentLocation,
} = useGeolocation();

watch(
  () => props.editingTask,

  (task) => {
    newTask.value = task
      ? task.title
      : "";

    if (previewUrl.value) {
      URL.revokeObjectURL(
        previewUrl.value,
      );
    }

    previewUrl.value = null;
    imgAttachmentKey.value = null;

    setLocationFromTask(task);
  },
);

async function handleImageChange(event) {
  const file = event.target.files[0];

  if (!file) return;

  if (previewUrl.value) {
    URL.revokeObjectURL(
      previewUrl.value,
    );
  }

  previewUrl.value =
    URL.createObjectURL(file);

  uploading.value = true;

  try {
    const response =
      await tasksApi.uploadImage(file);

    imgAttachmentKey.value =
      response.data.attachment_key;
  } catch (err) {
    console.error(
      "Erro ao fazer upload da imagem",
      err,
    );

    previewUrl.value = null;
    imgAttachmentKey.value = null;
  } finally {
    uploading.value = false;
  }
}

async function handleGetLocation() {
  const captured =
    await requestCurrentLocation();

  if (!captured) return;

  try {
    const address =
      await geocodingApi.reverse(
        captured.latitude,
        captured.longitude,
      );

    setLocationLabel(
      address?.label,
    );
  } catch {
    locationError.value =
      "Localização obtida, mas não foi possível identificar a rua.";
  }
}

function handleSubmit() {
  if (!newTask.value.trim()) {
    return;
  }

  const payload = {
    title: newTask.value.trim(),
    imgAttachmentKey:
      imgAttachmentKey.value,
    location: location.value,
  };

  if (props.editingTask) {
    emit(
      "update",
      props.editingTask.id,
      payload,
    );
  } else {
    emit("add", payload);
  }

  newTask.value = "";

  if (previewUrl.value) {
    URL.revokeObjectURL(
      previewUrl.value,
    );
  }

  previewUrl.value = null;
  imgAttachmentKey.value = null;

  clearLocation();
}

function handleCancel() {
  newTask.value = "";

  if (previewUrl.value) {
    URL.revokeObjectURL(
      previewUrl.value,
    );
  }

  previewUrl.value = null;
  imgAttachmentKey.value = null;

  clearLocation();

  emit("cancel");
}
</script>

<style scoped>
.task-form {
  margin-bottom: 24px;
  padding: 14px;
  background-color: #fffafb;
  border: 1px solid #f0ccd6;
  border-radius: 8px;
}

.task-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.task-input {
  flex: 1;
  padding: 12px;
  border: 2px solid #f0ccd6;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.task-input:focus {
  border-color: #d85c82;
}

.task-button {
  padding: 12px 20px;
  background-color: #da7799;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.task-button:hover:not(:disabled) {
  background-color: #b8476a;
}

.task-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.task-button-cancel {
  padding: 12px 16px;
  background-color: transparent;
  color: #8b6672;
  border: 2px solid #f0ccd6;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.task-button-cancel:hover {
  border-color: #dca4b5;
}

.image-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fff3f6;
  border-radius: 8px;
  border: 1px dashed #e4aebf;
  flex-wrap: wrap;
}

.image-preview {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #f0ccd6;
  flex-shrink: 0;
}

.image-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: white;
  border: 1.5px solid #d85c82;
  color: #c24c72;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.image-label:hover:not(.disabled) {
  background: #ffeaf0;
}

.image-label.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-input {
  display: none;
}

.image-help {
  font-size: 0.75rem;
  color: #a88690;
  margin: 0;
  flex-basis: 100%;
}

.upload-status {
  color: #8b6672;
}

/* Localização */

.location-section {
  margin-top: 12px;
  padding: 10px 12px;

  background: #fff3f6;

  border: 1px dashed #e4aebf;
  border-radius: 8px;
}

.location-help {
  margin: 0 0 10px;

  color: #a88690;
  font-size: 0.75rem;
}

.location-button,
.location-remove {
  padding: 8px 14px;

  background: white;
  color: #c24c72;

  border: 1.5px solid #d85c82;
  border-radius: 6px;

  font-size: 0.875rem;

  cursor: pointer;
}

.location-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.location-error {
  margin: 10px 0 0;

  color: #b4234d;
  font-size: 0.8rem;
}

.location-details {
  margin-top: 10px;
}

.location-details p {
  margin: 4px 0;

  color: #8b6672;
  font-size: 0.85rem;
}

.location-remove {
  margin-top: 10px;
}
</style>
