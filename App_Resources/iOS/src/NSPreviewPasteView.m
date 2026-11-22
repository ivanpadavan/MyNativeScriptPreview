#import "NSPreviewPasteView.h"

@interface NSPreviewPasteView ()
@property(nonatomic, strong) UIPasteControl *pasteControl;
@end

@implementation NSPreviewPasteView

- (instancetype)initWithFrame:(CGRect)frame {
    self = [super initWithFrame:frame];
    if (self) {
        self.pasteConfiguration = [[UIPasteConfiguration alloc]
            initWithAcceptableTypeIdentifiers:@[@"public.utf8-plain-text", @"public.plain-text", @"public.text"]];
        UIPasteControlConfiguration *configuration = [[UIPasteControlConfiguration alloc] init];
        configuration.displayMode = UIPasteControlDisplayModeIconAndLabel;
        self.pasteControl = [[UIPasteControl alloc] initWithConfiguration:configuration];
        self.pasteControl.target = self;
        self.pasteControl.accessibilityIdentifier = @"paste-project";
        self.pasteControl.accessibilityLabel = @"Вставить проект";
        self.pasteControl.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [self addSubview:self.pasteControl];
        self.isAccessibilityElement = NO;
    }
    return self;
}

- (void)layoutSubviews {
    [super layoutSubviews];
    self.pasteControl.frame = self.bounds;
}

- (BOOL)canPasteItemProviders:(NSArray<NSItemProvider *> *)itemProviders {
    for (NSItemProvider *provider in itemProviders) {
        if ([provider canLoadObjectOfClass:[NSString class]]) return YES;
    }
    return NO;
}

- (void)pasteItemProviders:(NSArray<NSItemProvider *> *)itemProviders {
    for (NSItemProvider *provider in itemProviders) {
        if (![provider canLoadObjectOfClass:[NSString class]]) continue;
        __weak NSPreviewPasteView *weakSelf = self;
        [provider loadObjectOfClass:[NSString class]
                 completionHandler:^(id<NSItemProviderReading> object, NSError *error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                NSPreviewPasteView *owner = weakSelf;
                if (!owner) return;
                if (error || ![(id)object isKindOfClass:[NSString class]]) {
                    if (owner.onFailure) owner.onFailure(error.localizedDescription ?: @"В буфере нет текста проекта.");
                } else if (owner.onPaste) {
                    owner.onPaste((NSString *)object);
                }
            });
        }];
        return;
    }
    if (self.onFailure) self.onFailure(@"В буфере нет текста проекта.");
}

@end
