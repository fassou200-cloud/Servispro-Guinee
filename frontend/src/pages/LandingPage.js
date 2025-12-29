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
      <header className="border-b border-border bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
                <span className="text-2xl font-bold text-white">S</span>
              </div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                ServisPro
              </h1>
            </div>
            <Button
              variant="outline"
              data-testid="provider-login-button"
              onClick={() => navigate('/auth')}
              className="border-primary text-primary hover:bg-primary hover:text-white"
            >
              Provider Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-50 via-yellow-50 to-red-50 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-accent rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-heading font-bold text-foreground mb-6 leading-tight">
              Find Trusted Service Providers
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed max-w-3xl mx-auto">
              Connect with verified electricians, mechanics, plumbers, and logistics providers. Quality service when you need it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                data-testid="browse-services-button"
                onClick={() => navigate('/browse')}
                className="h-16 px-10 text-lg font-heading font-bold bg-primary hover:bg-primary/90 text-white shadow-lg"
              >
                Browse Services
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/rentals')}
                className="h-16 px-10 text-lg font-heading font-bold border-2 border-primary text-primary hover:bg-primary hover:text-white"
              >
                <Home className="mr-2 h-5 w-5" />
                View Rentals
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">
              Service Categories
            </h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose from our range of professional services
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.name}
                  className="group overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer border-2 hover:border-primary transform hover:-translate-y-2"
                  data-testid={`category-card-${category.name.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => navigate(category.link)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-80 group-hover:opacity-70 transition-opacity`} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 mb-4 group-hover:scale-110 transition-transform">
                        <Icon className="h-10 w-10" />
                      </div>
                      <h4 className="text-2xl font-heading font-bold mb-2">{category.name}</h4>
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <p className="text-muted-foreground mb-4 text-center">{category.description}</p>
                    <Button
                      variant="ghost"
                      className="w-full gap-2 font-heading text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(category.link);
                      }}
                    >
                      View Providers
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
      <section className="bg-gradient-to-br from-muted/50 to-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h3 className="text-4xl font-heading font-bold text-foreground mb-16 text-center">
            Why Choose ServisPro
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="text-center group">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <Icon className="h-10 w-10" />
                  </div>
                  <h4 className="text-2xl font-heading font-bold text-foreground mb-3">
                    {feature.title}
                  </h4>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
                <span className="text-2xl font-bold text-white">S</span>
              </div>
              <div>
                <p className="font-heading font-bold text-lg text-foreground">ServisPro</p>
                <p className="text-sm text-muted-foreground">Professional Services Platform</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 ServisPro. All rights reserved.
            </p>
            <Button
              variant="link"
              onClick={() => navigate('/auth')}
              className="text-primary hover:text-primary/80"
            >
              Are you a service provider? Join us →
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;