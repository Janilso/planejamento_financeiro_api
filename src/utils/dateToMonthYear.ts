import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const dateToMonthYear = (date: string) => {
  const d = new Date(date);
  return format(d, 'MMM/yy', { locale: ptBR });
};

export default dateToMonthYear;
