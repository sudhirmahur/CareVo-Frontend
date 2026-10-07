import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { reportApi } from '../../api/report.api';
import { getErrorMessage, isNotAvailable } from '../../api/errors';
import useToast from '../../hooks/useToast';
import { REPORT_CONTENT_TYPES, REPORT_REASONS } from '../../utils/constants';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';

/**
 * Reusable report dialog. Pass `contentType` / `contentId` when reporting a
 * specific item; the content type stays selectable only when it is not known.
 */
export default function ReportModal({ open, onClose, contentType = '', contentId }) {
  const toast = useToast();
  const [submitError, setSubmitError] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { contentType, reason: '', description: '' } });

  useEffect(() => {
    if (open) {
      reset({ contentType, reason: '', description: '' });
      setSubmitError(null);
    }
  }, [open, contentType, reset]);

  const onSubmit = async (values) => {
    setSubmitError(null);
    try {
      await reportApi.create({ ...values, contentId });
      toast.success('Thanks. Our team will review your report.');
      onClose();
    } catch (error) {
      setSubmitError(
        isNotAvailable(error) ? 'Reporting is not available yet. Please try again later.' : getErrorMessage(error),
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report content"
      description="Tell us what is wrong. Reports are reviewed by the Carevo team."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Submit report
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Select
          label="Content type"
          options={REPORT_CONTENT_TYPES}
          placeholder="Select a type"
          disabled={Boolean(contentType)}
          error={errors.contentType?.message}
          {...register('contentType', { required: 'Select what you are reporting' })}
        />
        <Select
          label="Reason"
          options={REPORT_REASONS}
          placeholder="Select a reason"
          error={errors.reason?.message}
          {...register('reason', { required: 'Select a reason' })}
        />
        <Textarea label="Details (optional)" rows={4} placeholder="Add anything that helps us understand." {...register('description')} />
        {submitError && (
          <p role="alert" className="text-sm text-danger">
            {submitError}
          </p>
        )}
      </form>
    </Modal>
  );
}
