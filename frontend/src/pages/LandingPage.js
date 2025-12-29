import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Zap, Wrench, Droplet, Truck, Home, ArrowRight, Shield, Clock, Star } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const categories = [
    {
      name: 'Electrician',
      icon: Zap,
      description: 'Professional electrical services for your home and business',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
      color: 'from-yellow-500 to-yellow-600',
      link: '/browse?category=Electrician'
    },
    {
      name: 'Mechanic',
      icon: Wrench,
      description: 'Expert auto repair and maintenance services',
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80',
      color: 'from-red-500 to-red-600',
      link: '/browse?category=Mechanic'
    },
    {
      name: 'Plumber',
      icon: Droplet,
      description: 'Reliable plumbing solutions for all your needs',
      image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80',
      color: 'from-blue-500 to-blue-600',
      link: '/browse?category=Plumber'
    },
    {
      name: 'Logistics',
      icon: Truck,
      description: 'Fast and reliable delivery and logistics services',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
      color: 'from-green-500 to-green-600',
      link: '/browse?category=Logistics'
    }
  ];

  const features = [
    {
      icon: Shield,
      title: 'Verified Professionals',
      description: 'All service providers are ID verified for your safety'
    },
    {
      icon: Clock,
      title: 'Quick Response',
      description: 'Get responses from available providers fast'
    },
    {
      icon: Star,
      title: 'Quality Service',
      description: 'Experienced professionals ready to help'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              ServisPro
            </h1>
            <Button
              variant="outline"
              data-testid="provider-login-button"
              onClick={() => navigate('/auth')}
            >
              Provider Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-muted py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <h2 className="text-5xl md:text-6xl font-heading font-bold text-foreground mb-6 leading-tight">
              Find Trusted Service Providers
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Connect with verified electricians, mechanics, and plumbers in your area. Get quality service when you need it.
            </p>
            <Button
              size="lg"
              data-testid="browse-services-button"
              onClick={() => navigate('/browse')}
              className="h-14 px-8 text-lg font-heading font-bold gap-2"
            >
              Browse Services
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h3 className="text-3xl font-heading font-bold text-foreground mb-12">
            Service Categories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.name}
                  className="overflow-hidden hover:border-primary/50 transition-colors duration-300 cursor-pointer"
                  data-testid={`category-card-${category.name.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => navigate(category.link)}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <div className="flex items-center gap-2 text-white">
                        <Icon className="h-6 w-6" />
                        <span className="text-xl font-heading font-bold">{category.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-muted-foreground mb-4">{category.description}</p>
                    <Button
                      variant="ghost"
                      className="gap-2 p-0 h-auto font-heading"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(category.link);
                      }}
                    >
                      {category.name === 'Apartment Rentals' ? 'View Listings' : 'View Providers'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h3 className="text-3xl font-heading font-bold text-foreground mb-12 text-center">
            Why Choose ServisPro
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary mb-4">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-heading font-bold text-foreground mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 ServisPro. All rights reserved.
            </p>
            <Button
              variant="link"
              onClick={() => navigate('/auth')}
              className="text-primary"
            >
              Are you a service provider? Join us
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;