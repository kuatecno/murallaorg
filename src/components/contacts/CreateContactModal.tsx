'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ContactTypeConfig {
  id: string;
  name: string;
  label: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  order: number;
  fields: ContactFieldConfig[];
}

interface ContactFieldConfig {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  isVisible: boolean;
  order: number;
  placeholder: string | null;
  helpText: string | null;
  validation: any;
  options: any;
  defaultValue: string | null;
}

export default function CreateContactModal({ isOpen, onClose, onSuccess }: CreateContactModalProps) {
  const [contactTypes, setContactTypes] = useState<ContactTypeConfig[]>([]);
  const [selectedType, setSelectedType] = useState<ContactTypeConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [error, setError] = useState('');

  // Load contact types when modal opens
  useEffect(() => {
    if (isOpen) {
      loadContactTypes();
    }
  }, [isOpen]);

  const loadContactTypes = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch('/api/contact-types', {
        headers: {
          'x-tenant-id': user.tenantId,
        },
      });

      if (response.ok) {
        const types = await response.json();
        setContactTypes(types);
        if (types.length > 0) {
          setSelectedType(types[0]);
          initializeFormData(types[0]);
        }
      }
    } catch (error) {
      console.error('Error loading contact types:', error);
      setError('Failed to load contact types');
    } finally {
      setLoadingTypes(false);
    }
  };

  const initializeFormData = (type: ContactTypeConfig) => {
    const initialData: Record<string, any> = {};
    type.fields.forEach((field) => {
      initialData[field.fieldName] = field.defaultValue || '';
    });
    setFormData(initialData);
  };

  const handleTypeChange = (type: ContactTypeConfig) => {
    setSelectedType(type);
    initializeFormData(type);
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData({ ...formData, [fieldName]: value });
  };

  const renderField = (field: ContactFieldConfig) => {
    const value = formData[field.fieldName] || '';

    const baseInputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

    switch (field.fieldType) {
      case 'select':
        const options = field.options ? (Array.isArray(field.options) ? field.options : JSON.parse(field.options as string)) : [];
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            className={baseInputClass}
          >
            <option value="">Select {field.fieldLabel}</option>
            {options.map((option: string) => (
              <option key={option} value={option}>
                {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            placeholder={field.placeholder || ''}
            rows={3}
            className={baseInputClass}
          />
        );

      case 'number':
        const validation = field.validation ? (typeof field.validation === 'string' ? JSON.parse(field.validation) : field.validation) : {};
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            placeholder={field.placeholder || ''}
            min={validation.min}
            max={validation.max}
            step={validation.step}
            className={baseInputClass}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            placeholder={field.placeholder || ''}
            className={baseInputClass}
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            placeholder={field.placeholder || ''}
            className={baseInputClass}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            className={baseInputClass}
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            required={field.isRequired}
            placeholder={field.placeholder || ''}
            className={baseInputClass}
          />
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('User not authenticated');
      }

      const user = JSON.parse(userData);

      // Prepare contact data with schema fields
      const contactData: Record<string, any> = {
        contactType: selectedType?.name,
      };

      // Map form data to contact fields
      // Standard fields that exist in Contact model
      const standardFields = ['code', 'name', 'rut', 'email', 'phone', 'contactName',
                             'address', 'city', 'country', 'creditLimit', 'paymentTerms', 'rating'];

      const metadata: Record<string, any> = {};

      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          if (standardFields.includes(key)) {
            // Convert numeric fields
            if (key === 'creditLimit' || key === 'rating') {
              contactData[key] = parseFloat(value);
            } else {
              contactData[key] = value;
            }
          } else {
            // Custom fields go to metadata
            metadata[key] = value;
          }
        }
      });

      if (Object.keys(metadata).length > 0) {
        contactData.metadata = metadata;
      }

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId,
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create contact');
      }

      onSuccess();
      onClose();
      setFormData({});
      if (selectedType) {
        initializeFormData(selectedType);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Contact</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loadingTypes ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading contact types...</p>
            </div>
          ) : (
            <>
              {/* Contact Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Contact Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {contactTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedType?.id === type.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{type.icon || '📋'}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{type.label}</div>
                          {type.description && (
                            <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Fields */}
              {selectedType && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedType.fields
                    .filter(field => field.isVisible)
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <div
                        key={field.id}
                        className={field.fieldType === 'textarea' ? 'md:col-span-2' : ''}
                      >
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.fieldLabel}
                          {field.isRequired && <span className="text-red-500"> *</span>}
                        </label>
                        {renderField(field)}
                        {field.helpText && (
                          <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingTypes}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
