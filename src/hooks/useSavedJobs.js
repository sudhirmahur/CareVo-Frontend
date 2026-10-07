import { useCallback, useMemo } from 'react';
import { getErrorMessage, isNotAvailable } from '../api/errors';
import { jobApi } from '../api/job.api';
import { getId, unwrapList } from '../utils/helpers';
import { normalizeJob } from '../utils/normalizers';
import useApi from './useApi';
import useToast from './useToast';

/** Saved jobs state shared by Jobs, Job Details and Saved Jobs. Backend module is planned. */
export default function useSavedJobs() {
  const toast = useToast();
  const request = useCallback(() => jobApi.listSaved(), []);
  const { data, loading, error, notAvailable, reload, setData } = useApi(request);

  const savedJobs = useMemo(() => unwrapList(data).map(normalizeJob), [data]);
  const savedIds = useMemo(() => new Set(savedJobs.map((job) => job.id)), [savedJobs]);

  const toggle = useCallback(
    async (job) => {
      const isSaved = savedIds.has(job.id);
      try {
        if (isSaved) await jobApi.unsave(job.id);
        else await jobApi.save(job.id);
        await reload();
        toast.success(isSaved ? 'Removed from saved jobs' : 'Job saved');
      } catch (err) {
        toast.error(isNotAvailable(err) ? 'Saving jobs is coming soon.' : getErrorMessage(err));
      }
    },
    [savedIds, reload, toast],
  );

  return { savedJobs, savedIds, loading, error, notAvailable, reload, toggle, setData, getId };
}
