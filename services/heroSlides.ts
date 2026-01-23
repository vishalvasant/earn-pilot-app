import { api } from './api';

export interface HeroSlide {
  id: number;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
}

export interface HeroSlidesResponse {
  success: boolean;
  slides: HeroSlide[];
}

export const getHeroSlides = async (): Promise<HeroSlide[]> => {
  try {
    const response = await api.get<HeroSlidesResponse>('/hero-slides');
    return response.data.slides || [];
  } catch (error) {
    console.error('Failed to fetch hero slides:', error);
    return [];
  }
};
