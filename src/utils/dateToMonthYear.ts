import { tz } from '@date-fns/tz';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { APP_TIME_ZONE } from './timeZone';

const dateToMonthYear = (date: string) => {
  const d = new Date(date);
  return format(d, 'MMM/yy', { locale: ptBR, in: tz(APP_TIME_ZONE) });
};

export default dateToMonthYear;
